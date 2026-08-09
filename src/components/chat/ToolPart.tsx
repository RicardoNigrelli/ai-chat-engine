'use client';

type GenericToolPart = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

/** Nuestras tools no tiran excepciones: atrapan el error y lo devuelven como `{ error: "..." }` dentro de un output "exitoso" (ver src/lib/ai/tools/*). Esto lo detecta para no mostrarlo como un JSON crudo más. */
function getOutputError(output: unknown): string | undefined {
  if (output != null && typeof output === 'object' && 'error' in output) {
    const value = (output as Record<string, unknown>).error;
    if (typeof value === 'string') return value;
  }
  return undefined;
}

/**
 * Renderiza cualquier tool call de forma genérica (nombre + input + output),
 * sin necesidad de un componente por tool. Para una tool puntual que merezca
 * una UI custom (ej. mostrar un mapa para "weather"), armá un componente
 * dedicado siguiendo el patrón de la doc de la AI SDK (UIToolInvocation) y
 * usalo en MessageBubble en vez de este fallback genérico.
 */
export function ToolPart({ part }: { part: GenericToolPart }) {
  const toolName = part.type.replace(/^tool-/, '');
  const outputError = part.state === 'output-available' ? getOutputError(part.output) : undefined;
  const hasError = part.state === 'output-error' || outputError != null;

  return (
    <div
      className={`my-1 rounded-lg border px-3 py-2 text-sm ${
        hasError
          ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <div
        className={`flex items-center gap-2 font-medium ${
          hasError ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'
        }`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${hasError ? 'bg-amber-500' : 'bg-zinc-400'}`} />
        {toolName}
        {part.state && part.state !== 'output-available' && part.state !== 'output-error' && (
          <span className="text-xs font-normal text-zinc-400">· ejecutando...</span>
        )}
      </div>

      {part.input != null && (
        <pre className="mt-1 overflow-x-auto text-xs text-zinc-500 dark:text-zinc-500">
          {JSON.stringify(part.input, null, 2)}
        </pre>
      )}

      {part.state === 'output-available' && !outputError && part.output != null && (
        <pre className="mt-1 overflow-x-auto text-xs text-zinc-700 dark:text-zinc-300">
          {typeof part.output === 'string' ? part.output : JSON.stringify(part.output, null, 2)}
        </pre>
      )}

      {outputError && (
        <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
          <span aria-hidden>⚠</span> {outputError}
        </p>
      )}

      {part.state === 'output-error' && (
        <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
          <span aria-hidden>⚠</span> {part.errorText ?? 'La tool falló al ejecutarse.'}
        </p>
      )}
    </div>
  );
}
