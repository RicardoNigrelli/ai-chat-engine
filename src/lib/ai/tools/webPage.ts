import { tool } from 'ai';
import { z } from 'zod';

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./, // link-local / cloud metadata
  /^\[?::1\]?$/,
];

function isBlockedUrl(url: URL): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  return BLOCKED_HOSTNAME_PATTERNS.some(pattern => pattern.test(url.hostname));
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tool típica de agente: leer una URL puntual (a diferencia de webSearch,
 * que busca). Bloquea localhost/IPs privadas para evitar SSRF hacia
 * servicios internos de red.
 */
export const readWebPageTool = tool({
  description:
    'Descarga una URL pública y devuelve su contenido como texto plano (sin HTML). Usala cuando el usuario te pase un link o cuando webSearch te devuelva una URL que necesitás leer en detalle.',
  inputSchema: z.object({
    url: z.string().url().describe('URL completa a leer, ej: "https://ejemplo.com/articulo"'),
  }),
  execute: async ({ url }) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { url, error: 'URL inválida' };
    }

    if (isBlockedUrl(parsed)) {
      return { url, error: 'No se permite acceder a esta URL (host bloqueado o protocolo no soportado)' };
    }

    try {
      const response = await fetch(parsed, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'chat-general-bot/1.0' },
      });

      if (!response.ok) {
        return { url, error: `Respuesta HTTP ${response.status}` };
      }

      const contentType = response.headers.get('content-type') ?? '';
      const raw = await response.text();
      const text = contentType.includes('html') ? htmlToText(raw) : raw;

      return { url, content: text.slice(0, 8000) };
    } catch (error) {
      return { url, error: `No se pudo descargar la URL: ${(error as Error).message}` };
    }
  },
});
