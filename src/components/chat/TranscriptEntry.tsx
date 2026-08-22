'use client';

import type { ChatAgentUIMessage } from '@/lib/ai/agents/chatAgent';

/**
 * Una entrada del registro de ejecución. No es una burbuja: es una fila de
 * traza con canaleta izquierda numerada (ver DESIGN.md §3 — el eje es la
 * densidad). El turno del usuario se distingue por **fill sólido de tinta**,
 * no por una burbuja de color alineada a la derecha.
 *
 * Las tool calls NO se renderizan acá — viven en el panel lateral `TracePanel`,
 * ver Chat.tsx. Esta columna queda para el texto de la conversación.
 */
export function TranscriptEntry({
  message,
  index,
  isStreaming,
}: {
  message: ChatAgentUIMessage;
  index: number;
  isStreaming: boolean;
}) {
  const isUser = message.role === 'user';
  const step = String(index + 1).padStart(2, '0');

  return (
    <article className={isUser ? 'bg-ink text-on-ink' : ''}>
      <div className="flex">
        {/* Canaleta: numeración del paso y rol. Ancho fijo de 72px. */}
        <div className="w-[72px] shrink-0 select-none px-4 py-4 text-right font-mono text-[13px] leading-[1.45]">
          <div className={isUser ? 'text-on-ink' : 'text-ink-3'}>{step}</div>
          <div className={`mt-1 ${isUser ? 'text-on-ink' : 'text-ink-3'}`}>
            {isUser ? 'tú' : 'ia'}
          </div>
        </div>

        {/* Tick de canaleta — se dibuja al entrar (motion #1). */}
        <div
          className={`anim-rule w-px shrink-0 ${isUser ? 'bg-on-ink' : 'bg-sunken'}`}
          aria-hidden
        />

        <div className="min-w-0 flex-1 py-4 pl-4 pr-6">
          {message.parts.map((part, partIndex) => {
            if (part.type === 'text') {
              const isLast = partIndex === message.parts.length - 1;
              return (
                <p
                  key={partIndex}
                  className="max-w-[64ch] whitespace-pre-wrap text-[16px] leading-[1.55]"
                >
                  {part.text}
                  {/* Cursor de bloque durante el streaming (motion #3). */}
                  {isStreaming && isLast && (
                    <span className="anim-cursor ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.1em] bg-ink" />
                  )}
                </p>
              );
            }

            if (part.type === 'reasoning') {
              // El razonamiento NO va como itálica gris tenue (anti-patrón
              // explícito y además falla contraste). Es su propio registro,
              // rotulado y plegable, en la superficie hundida.
              return (
                <details key={partIndex} className="my-3 -ml-4 mr-2 bg-sunken">
                  <summary className="cursor-pointer px-4 py-2 font-mono text-[13px] leading-[1.45] text-ink-2 marker:content-none">
                    razonamiento
                  </summary>
                  <p className="max-w-[64ch] whitespace-pre-wrap px-4 pb-3 text-[16px] leading-[1.55] text-ink-2">
                    {part.text}
                  </p>
                </details>
              );
            }

            return null;
          })}
        </div>
      </div>
    </article>
  );
}
