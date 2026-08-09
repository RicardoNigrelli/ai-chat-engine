'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import type { ChatAgentUIMessage } from '@/lib/ai/agents/chatAgent';
import { MessageBubble } from './MessageBubble';

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
 */
export function Chat({ api = '/api/chat' }: { api?: string }) {
  const { messages, sendMessage, status, error, regenerate } = useChat<ChatAgentUIMessage>({
    transport: new DefaultChatTransport({ api }),
  });
  const [input, setInput] = useState('');

  const isBusy = status === 'submitted' || status === 'streaming';
  const statusLabel = status === 'submitted' ? 'Enviando...' : status === 'streaming' ? 'Respondiendo...' : null;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="mx-auto max-w-sm text-center text-sm text-zinc-400">
            Preguntame lo que sea. Puedo calcular, decirte la fecha/hora, leer una URL, buscar en la
            web y consultar tu base de conocimiento.
          </p>
        )}

        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {error && (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <p>{describeClientError(error)}</p>
            <button
              type="button"
              onClick={() => regenerate()}
              className="rounded-full border border-red-300 px-3 py-1 text-xs dark:border-red-800"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={event => {
          event.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
        className="border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        {statusLabel && <p className="mb-1.5 px-1 text-xs text-zinc-400">{statusLabel}</p>}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            disabled={isBusy}
            placeholder="Escribí un mensaje..."
            className="flex-1 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
