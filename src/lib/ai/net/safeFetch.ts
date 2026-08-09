import { isIP } from 'node:net';
import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { Agent, fetch as undiciFetch } from 'undici';

/**
 * Capa de red con control de SSRF, compartida por todas las tools que salen a
 * internet. Vive fuera de `tools/` a propósito: es infraestructura, no una
 * tool, y ninguna tool debería importar el dispatcher desde otra tool.
 *
 * El control original (en `tools/webPage.ts`) comparaba `url.hostname` contra
 * una lista de regex y dejaba pasar tres casos reales:
 *
 * 1. **Redirecciones.** El chequeo corría una sola vez sobre la URL inicial y
 *    `fetch` sigue redirecciones por defecto, así que un host público que
 *    respondiera 302 hacia `http://169.254.169.254/` (metadata de nube) se
 *    descargaba igual.
 * 2. **Nombres que resuelven a direcciones privadas.** Las regex solo
 *    matcheaban literales, así que `localtest.me` o `127.0.0.1.nip.io`
 *    —que resuelven a loopback— pasaban limpio.
 * 3. **DNS rebinding.** Aun validando el nombre antes de pedirlo, entre la
 *    validación y la apertura del socket el nombre se puede volver a resolver
 *    a otra IP (TOCTOU).
 *
 * Las capas que lo cubren:
 *
 * - `rejectionReason()` valida protocolo, puerto y **dirección resuelta**
 *   antes de conectar. Da errores claros y corta temprano.
 * - `safeFetch()` repite esa validación en **cada salto** de la cadena de
 *   redirecciones, que por eso se sigue a mano.
 * - `guardedLookup()` es **la frontera de seguridad real**: se instala como
 *   `lookup` del socket vía `guardedAgent`, así que la dirección que se valida
 *   es exactamente la que se conecta. Eso cierra el rebinding: ya no hay
 *   ventana entre resolver y conectar, porque es la misma resolución.
 */

/** Rangos IPv4 que no deben alcanzarse desde una tool. */
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // privada
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local / metadata de nube
  if (a === 172 && b >= 16 && b <= 31) return true; // privada
  if (a === 192 && b === 168) return true; // privada
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 192 && b === 0) return true; // 192.0.0/24 y 192.0.2/24
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking 198.18/15
  if (a === 198 && b === 51) return true; // documentación 198.51.100/24
  if (a === 203 && b === 0) return true; // documentación 203.0.113/24
  if (a >= 224) return true; // multicast 224/4, reservado 240/4, broadcast

  return false;
}

/**
 * Expande un IPv6 a sus 8 grupos de 16 bits. Hace falta comparar sobre los
 * números y no sobre el texto: `[::ffff:127.0.0.1]` lo normaliza el parser de
 * URL a `::ffff:7f00:1`, así que buscar la IPv4 embebida con una regex
 * decimal la deja pasar. Ese fue un bypass real detectado al probar.
 */
function expandIPv6(addr: string): number[] | null {
  let text = addr;

  // Cola en notación decimal (::ffff:127.0.0.1) → a dos grupos hex.
  const tail = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const octets = tail[1].split('.').map(Number);
    if (octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    const hex = `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
    text = text.slice(0, -tail[1].length) + hex;
  }

  const [head, rest, extra] = text.split('::');
  if (extra !== undefined) return null; // más de un "::" es inválido

  const parse = (part: string) => (part === '' ? [] : part.split(':').map(g => parseInt(g, 16)));
  const left = parse(head);
  const right = rest === undefined ? [] : parse(rest);

  const groups =
    rest === undefined
      ? left
      : [...left, ...Array(8 - left.length - right.length).fill(0), ...right];

  if (groups.length !== 8 || groups.some(g => !Number.isInteger(g) || g < 0 || g > 0xffff)) {
    return null;
  }
  return groups;
}

function isPrivateIPv6(ip: string): boolean {
  const groups = expandIPv6(ip.toLowerCase().replace(/^\[|\]$/g, ''));
  if (!groups) return true; // no parseable: se rechaza

  const embeddedV4 = (a: number, b: number) => `${a >> 8}.${a & 0xff}.${b >> 8}.${b & 0xff}`;

  const firstFiveZero = groups.slice(0, 5).every(g => g === 0);

  // ::ffff:a.b.c.d (IPv4-mapped) y ::a.b.c.d (IPv4-compatible, obsoleta).
  if (firstFiveZero && (groups[5] === 0xffff || groups[5] === 0)) {
    if (groups[6] === 0 && groups[7] === 0) return true; // ::
    if (groups[5] === 0 && groups[6] === 0 && groups[7] === 1) return true; // ::1
    return isPrivateIPv4(embeddedV4(groups[6], groups[7]));
  }

  if ((groups[0] & 0xfe00) === 0xfc00) return true; // ULA fc00::/7
  if ((groups[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((groups[0] & 0xff00) === 0xff00) return true; // multicast ff00::/8
  if (groups[0] === 0x0064 && groups[1] === 0xff9b) return true; // NAT64
  if (groups[0] === 0x2002) return isPrivateIPv4(embeddedV4(groups[1], groups[2])); // 6to4

  return false;
}

function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // no es una IP válida: se rechaza
}

/**
 * `lookup` del socket. Node le entrega a `net.connect` la dirección que esta
 * función devuelve, así que validar acá elimina la ventana de TOCTOU: no se
 * puede conectar a una dirección distinta de la que se aprobó.
 */
function guardedLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, '');
      return;
    }

    const offending = addresses.find(entry => isPrivateAddress(entry.address));
    if (offending) {
      const blocked: NodeJS.ErrnoException = new Error(
        `destino bloqueado: ${hostname} resuelve a una dirección privada o reservada (${offending.address})`,
      );
      blocked.code = 'ESSRFBLOCKED';
      callback(blocked, '');
      return;
    }

    if (options.all) {
      callback(null, addresses);
      return;
    }
    callback(null, addresses[0].address, addresses[0].family);
  });
}

/**
 * Un solo agente a nivel de módulo, para aprovechar el pooling. **Cualquier
 * tool que salga a internet debería usar este dispatcher en vez de `fetch`
 * pelado**, incluso si el host es fijo: es una línea de defensa gratis y evita
 * que la próxima tool nazca sin ella.
 */
export const guardedAgent = new Agent({
  connect: { lookup: guardedLookup },
});

/**
 * Valida una URL antes de pedirla. Devuelve el motivo del rechazo, o
 * `undefined` si se puede seguir.
 */
async function rejectionReason(url: URL): Promise<string | undefined> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `protocolo no soportado (${url.protocol.replace(':', '')})`;
  }

  // Solo puertos web. Sin esto, la tool sirve para escanear servicios
  // internos por puerto aunque la IP sea pública.
  const port = url.port === '' ? (url.protocol === 'https:' ? '443' : '80') : url.port;
  if (port !== '80' && port !== '443') {
    return `puerto no permitido (${port}); solo 80 y 443`;
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');

  // Si ya es una IP literal, se juzga directo: no hay nada que resolver.
  if (isIP(host) !== 0) {
    return isPrivateAddress(host) ? `dirección privada o reservada (${host})` : undefined;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return `no se pudo resolver el host (${host})`;
  }

  if (addresses.length === 0) return `el host no resolvió a ninguna dirección (${host})`;

  // Basta con que UNA de las direcciones sea privada para rechazar: si no,
  // un host con registro doble (una pública y una interna) pasaría el filtro
  // y podría conectarse a la interna.
  const offending = addresses.find(entry => isPrivateAddress(entry.address));
  if (offending) {
    return `el host resuelve a una dirección privada o reservada (${host} → ${offending.address})`;
  }

  return undefined;
}

const MAX_REDIRECTS = 5;

export type SafeResponse = Awaited<ReturnType<typeof undiciFetch>>;

/**
 * Sigue la cadena de redirecciones a mano (`redirect: 'manual'`), validando
 * **cada** URL intermedia. `redirect: 'follow'` haría los saltos dentro de
 * `fetch`, donde ya no hay forma de inspeccionarlos.
 */
export async function safeFetch(
  start: URL,
  signal: AbortSignal,
  headers: Record<string, string> = {},
): Promise<{ response: SafeResponse; finalUrl: URL } | { error: string }> {
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const reason = await rejectionReason(current);
    if (reason) {
      return {
        error:
          hop === 0
            ? `No se permite acceder a esta URL: ${reason}`
            : `La URL redirigió a un destino no permitido: ${reason}`,
      };
    }

    // `dispatcher: guardedAgent` es lo que hace que la conexión pase por
    // `guardedLookup`. Sin eso las dos capas anteriores siguen siendo
    // vulnerables a rebinding.
    const response = await undiciFetch(current, {
      signal,
      redirect: 'manual',
      headers,
      dispatcher: guardedAgent,
    });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      let next: URL;
      try {
        next = new URL(location, current); // puede ser relativa
      } catch {
        return { error: `La URL redirigió a un destino inválido (${location})` };
      }
      current = next;
      continue;
    }

    return { response, finalUrl: current };
  }

  return { error: `Demasiadas redirecciones (más de ${MAX_REDIRECTS})` };
}

/**
 * Un bloqueo de `guardedLookup` llega envuelto como "fetch failed" y el motivo
 * real viaja en `cause`. Sin desenvolverlo, un corte de seguridad se leería
 * como una falla de red cualquiera.
 */
export function describeBlockedCause(error: unknown): string | undefined {
  const cause = (error as { cause?: NodeJS.ErrnoException })?.cause;
  return cause?.code === 'ESSRFBLOCKED' ? cause.message : undefined;
}
