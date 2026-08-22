'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useId, useState } from 'react';
import type { ChatAgentUIMessage } from '@/lib/ai/agents/chatAgent';
import { TranscriptEntry } from './TranscriptEntry';
import { TracePanel } from './TracePanel';
import { ThinkingIndicator } from './ThinkingIndicator';
import { KnowledgeUpload } from './KnowledgeUpload';
import { useSessionId } from '@/hooks/useSessionId';

/**
 * El servidor ya manda un mensaje traducido y accionable vía `onError` (ver
 * describeAgentError en lib/ai/errors.ts). Esto es solo un colchón para el
 * caso en que el error ocurra ANTES de llegar al servidor (ej. server
 * caído, sin red) — ahí `error.message` es un mensaje técnico del browser
 * ("Failed to fetch") que tampoco le sirve al usuario.
 */
function describeClientError(error: Error): string {
  const msg = error.message || '';

  // Respuestas que el servidor corta ANTES de createAgentUIStreamResponse
  // (ej. el rate limit en route.ts) le llegan al cliente como el body crudo
  // de la respuesta, no como un mensaje ya traducido por describeAgentError.
  // Acá se intenta extraer el campo `error` si el body es JSON.
  try {
    const parsed = JSON.parse(msg);
    if (parsed && typeof parsed.error === 'string') return parsed.error;
  } catch {
    // No era JSON, seguimos con el resto de los casos.
  }

  if (!msg || msg === 'An error occurred.') {
    return 'Ocurrió un error y el servidor no dio más detalle. Revisá los logs de `npm run dev`.';
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'No se pudo conectar con el servidor. Verificá que esté corriendo (`npm run dev`).';
  }
  return msg;
}

/**
 * Widget de chat reusable. Pensado para poder montarse en cualquier app
 * Next.js apuntando a la ruta `/api/chat` de ese proyecto (o a otra ruta
 * vía la prop `api`, si embebés esto en una app que expone el endpoint en
 * otro lado).
 *
 * La interfaz es un **registro de ejecución**, no un messenger: ver DESIGN.md.
 */
export function Chat({ api = '/api/chat' }: { api?: string }) {
  const sessionId = useSessionId();
  const { messages, sendMessage, status, error, regenerate } = useChat<ChatAgentUIMessage>({
    transport: new DefaultChatTransport({ api, headers: { 'x-session-id': sessionId } }),
  });
  const [input, setInput] = useState('');
  const inputId = useId();

  const isBusy = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-w-0 flex-[1_1_60%] flex-col border-r border-sunken">
        <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1000px]">
          {messages.length === 0 && (
            <div className="flex">
              <div className="w-[72px] shrink-0 px-4 py-4 text-right font-mono text-[13px] leading-[1.45] text-ink-3">
                00
              </div>
              <div className="w-px shrink-0 bg-sunken" aria-hidden />
              <p className="max-w-[64ch] py-4 pl-4 pr-6 text-[16px] leading-[1.55] text-ink-2">
                Preguntame lo que sea. Puedo calcular, decirte la fecha/hora, leer una URL, buscar
                en la web y consultar tu base de conocimiento. Cada tool que use queda registrada
                acá abajo con su input y su output.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <TranscriptEntry
              key={message.id}
              message={message}
              index={index}
              isStreaming={status === 'streaming' && index === messages.length - 1}
            />
          ))}

          {error && (
            <div className="flex">
              <div className="w-[72px] shrink-0 px-4 py-4 text-right font-mono text-[13px] leading-[1.45] text-warn">
                ××
              </div>
              <div className="w-px shrink-0 bg-warn" aria-hidden />
              <div className="py-4 pl-4 pr-6">
                <p className="max-w-[64ch] text-[16px] leading-[1.55] text-warn">
                  {describeClientError(error)}
                </p>
                <button
                  type="button"
                  onClick={() => regenerate()}
                  className="mt-2 min-h-[24px] rounded-[3px] bg-ink px-3 py-1 font-mono text-[13px] leading-[1.45] text-on-ink"
                >
                  reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={event => {
          event.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
        className="bg-raised"
      >
        <div className="mx-auto flex w-full max-w-[1000px] items-start">
          {/* Label visible en la canaleta — el placeholder no alcanza como
              etiqueta (H6/E6), y acá encaja con la estética de instrumento. */}
          <label
            htmlFor={inputId}
            className="w-[72px] shrink-0 px-4 py-4 text-right font-mono text-[13px] leading-[1.45] text-ink-3"
          >
            msg
          </label>
          <div className="w-px shrink-0 self-stretch bg-sunken" aria-hidden />

          <div id="tour-input" className="flex min-w-0 flex-1 items-start gap-3 py-4 pl-4 pr-6">
            <input
              id={inputId}
              value={input}
              onChange={event => setInput(event.target.value)}
              disabled={isBusy}
              placeholder="Escribí un mensaje..."
              autoComplete="off"
              className="min-h-[24px] flex-1 rounded-[3px] bg-paper px-3 py-1.5 text-[16px] leading-[1.55] text-ink outline-none placeholder:text-ink-3 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isBusy || !input.trim()}
              className="min-h-[24px] rounded-[3px] bg-ink px-4 py-1.5 font-mono text-[13px] leading-[1.45] text-on-ink transition-opacity duration-150 disabled:opacity-40"
            >
              enviar
            </button>
          </div>
        </div>

        <div id="tour-knowledge" className="mx-auto w-full max-w-[1000px] pb-3 pl-[89px] pr-6">
          <KnowledgeUpload sessionId={sessionId} />
        </div>

        <div className="mx-auto w-full max-w-[1000px] pb-3 pl-[89px] font-mono text-[13px] leading-[1.45] text-ink-3">
          <span aria-live="polite">
            {isBusy ? <ThinkingIndicator status={status as 'submitted' | 'streaming'} /> : 'listo'}
          </span>
        </div>
      </form>
    </div>

      <div id="tour-trace" className="hidden w-[360px] shrink-0 lg:block">
        <TracePanel messages={messages} />
      </div>
    </div>
  );
}
