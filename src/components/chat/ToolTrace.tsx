'use client';

import { useEffect, useState } from 'react';

type GenericToolPart = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

/** Nuestras tools no tiran excepciones: atrapan el error y lo devuelven como
 * `{ error: "..." }` dentro de un output "exitoso" (ver src/lib/ai/tools/*).
 * Esto lo detecta para no mostrarlo como una fila de datos más. */
function getOutputError(output: unknown): string | undefined {
  if (output != null && typeof output === 'object' && 'error' in output) {
    const value = (output as Record<string, unknown>).error;
    if (typeof value === 'string') return value;
  }
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Tiempo transcurrido medido en el cliente, desde que la tool aparece en el
 * stream hasta que llega su output. Incluye latencia de red y de streaming —
 * no es tiempo de ejecución del servidor, y por eso la columna se rotula
 * "elapsed" y no "duración". Se mide de verdad; no es un número decorativo.
 */
function useElapsed(done: boolean): number | null {
  const [start] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  const [measurable] = useState(() => !done);

  useEffect(() => {
    // Al completarse la tool el intervalo se corta y el valor queda quieto
    // solo: no hace falta congelarlo explícitamente. El muestreo cada 50ms
    // subreporta como mucho 50ms, dentro del error de una medición que ya
    // incluye latencia de red.
    if (done) return;
    const id = setInterval(() => setElapsed(Date.now() - start), 50);
    return () => clearInterval(id);
  }, [done, start]);

  // `0` no significa "instantánea": significa que input y output llegaron en
  // el mismo flush del stream, así que el cliente nunca vio la ejecución. Pasa
  // de verdad —`readWebPage` en un paso posterior descarga una página entera y
  // aun así marca 0— y rotularlo "<50ms" afirmaba que una petición de red fue
  // instantánea. Sin dato es mejor que con un dato falso. Para tener el número
  // real hay que medirlo en el servidor, donde la tool efectivamente corre.
  return measurable && elapsed > 0 ? elapsed : null;
}

/** Lee el tiempo que midió el servidor, si la tool alcanzó a devolver output. */
function getElapsedMs(output: unknown): number | null {
  if (output == null || typeof output !== 'object') return null;
  const value = (output as { _elapsedMs?: unknown })._elapsedMs;
  return typeof value === 'number' ? value : null;
}

function formatElapsed(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Varias tools devuelven el input dentro del output (`{ query, results }`,
 * `{ expression, result }`). Repetirlo sería ruido en una interfaz cuyo eje
 * es la densidad, así que el bloque de output omite las claves cuyo valor es
 * idéntico al que ya se mostró en el input. Es genérico: no sabe nada de
 * ninguna tool en particular.
 */
function omitEchoedInput(output: unknown, input: unknown): unknown {
  if (!isPlainObject(output) || !isPlainObject(input)) return output;
  const kept = Object.entries(output).filter(
    ([key, value]) => !(key in input) || JSON.stringify(input[key]) !== JSON.stringify(value),
  );
  return kept.length > 0 ? Object.fromEntries(kept) : output;
}

/** Un valor primitivo, formateado para el registro. */
function Scalar({ value }: { value: unknown }) {
  if (typeof value === 'string') {
    // Los textos largos (chunks de RAG, contenido de una página) se pliegan
    // para que una sola fuente no sepulte el resto de la traza.
    if (value.length > 200) {
      // Un valor largo (chunk de RAG, contenido de una página) es prosa, no
      // un dato: pasa al registro de prosa —sans, 16px, medida acotada— en
      // vez de quedarse en el mono de 13px de la maquinaria. El auditor
      // marcaba acá 81 car/línea y 13px en lectura continua (T1/T5).
      return (
        <details className="group">
          <summary className="cursor-pointer text-ink-3 marker:content-none">
            <span className="text-ink">{value.slice(0, 72).trim()}…</span>{' '}
            <span className="text-ink-3 group-open:hidden">[+{value.length - 72}]</span>
            <span className="hidden text-ink-3 group-open:inline">[−]</span>
          </summary>
          <p className="mt-2 max-w-[64ch] whitespace-pre-wrap font-sans text-[16px] leading-[1.55] text-ink-2">
            {value}
          </p>
        </details>
      );
    }
    return <span className="text-ink">{value}</span>;
  }
  if (typeof value === 'number') return <span className="text-ink tabular-nums">{value}</span>;
  if (typeof value === 'boolean') return <span className="text-ink">{String(value)}</span>;
  if (value == null) return <span className="text-ink-3">—</span>;
  return <span className="text-ink">{JSON.stringify(value)}</span>;
}

/**
 * Render genérico y **tipado** de cualquier valor de tool. Sigue siendo
 * agnóstico a la tool (no hay un componente por tool: agregás una tool y su
 * IO se dibuja solo), pero en vez de un `JSON.stringify` dentro de un `<pre>`
 * produce filas clave/valor, y despliega las listas de objetos —el caso del
 * RAG y de webSearch— como bloques con su propio subregistro.
 */
function Rows({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ink-3">(vacío)</span>;
    return (
      <div className="flex flex-col gap-2">
        {value.map((item, index) => (
          <div key={index} className="border-l-2 border-sunken pl-3">
            {isPlainObject(item) ? (
              <Rows value={item} depth={depth + 1} />
            ) : (
              <Scalar value={item} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    // Las claves con guión bajo son metadato de la traza (`_elapsedMs`), no
    // datos que la tool le haya devuelto al modelo: se muestran en la
    // cabecera, no como una fila más del output.
    const entries = Object.entries(value).filter(([key]) => !key.startsWith('_'));
    if (entries.length === 0) return <span className="text-ink-3">(vacío)</span>;
    return (
      <dl className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-x-4 gap-y-1">
        {entries.map(([key, item]) => (
          <div key={key} className="contents">
            <dt className="text-ink-3">{key}</dt>
            <dd className="min-w-0 break-words">
              {isPlainObject(item) || Array.isArray(item) ? (
                <Rows value={item} depth={depth + 1} />
              ) : (
                <Scalar value={item} />
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <Scalar value={value} />;
}

/**
 * Una llamada a tool dentro de la traza. Es el contenido de primera clase de
 * esta interfaz, no un detalle plegado: el eje del diseño es la densidad y la
 * maquinaria es lo que el producto tiene de valioso (ver DESIGN.md §1 y §3).
 */
export function ToolTrace({ part }: { part: GenericToolPart }) {
  const toolName = part.type.replace(/^tool-/, '');
  const outputError = part.state === 'output-available' ? getOutputError(part.output) : undefined;
  const hasError = part.state === 'output-error' || outputError != null;
  const isDone = part.state === 'output-available' || part.state === 'output-error';

  // El tiempo medido en el servidor es el bueno (ver `timed()` en
  // src/lib/ai/tools/index.ts). El del cliente queda como respaldo para los
  // casos en que sí es observable, p. ej. si la tool falla antes de devolver.
  const serverElapsed = getElapsedMs(part.output);
  const clientElapsed = useElapsed(isDone);
  const elapsed = serverElapsed ?? clientElapsed;

  // El estado nunca se transmite solo por color (C8): va con texto y con una
  // forma distinta en el marcador.
  const status = hasError ? 'error' : isDone ? 'ok' : 'corriendo';
  const marker = hasError ? '×' : isDone ? '•' : '▸';
  const statusColor = hasError ? 'text-warn' : isDone ? 'text-ok' : 'text-ink-3';

  return (
    <div className="relative overflow-hidden bg-raised font-mono text-[13px] leading-[1.45]">
      {!isDone && <span className="anim-sweep pointer-events-none absolute inset-0" aria-hidden />}

      <div className="relative flex items-baseline gap-3 px-4 py-2">
        <span className={statusColor} aria-hidden>
          {marker}
        </span>
        <span className="font-medium text-ink">{toolName}</span>
        <span className={`ml-auto ${statusColor}`}>{status}</span>
        {elapsed !== null && (
          <span className="tabular-nums text-ink-3">{formatElapsed(elapsed)}</span>
        )}
      </div>

      {part.input != null && (
        <div className="relative px-4 pb-2 pl-10">
          <Rows value={part.input} />
        </div>
      )}

      {isDone && !hasError && part.output != null && (
        <div className="relative border-t border-sunken px-4 py-2 pl-10">
          <Rows value={omitEchoedInput(part.output, part.input)} />
        </div>
      )}

      {(outputError || part.state === 'output-error') && (
        <p className="relative border-t border-sunken px-4 py-2 pl-10 text-warn">
          {outputError ?? part.errorText ?? 'La tool falló al ejecutarse.'}
        </p>
      )}
    </div>
  );
}
