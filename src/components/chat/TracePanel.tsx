'use client';

import type { ChatAgentUIMessage } from '@/lib/ai/agents/chatAgent';
import { ToolTrace, type GenericToolPart } from './ToolTrace';

/**
 * Panel lateral persistente con la traza de ejecución completa de la
 * conversación — todas las tool calls, de todos los turnos, en orden. Cada
 * entrada sigue siendo el `ToolTrace` real (mismo cronómetro, mismo
 * `Rows`/`Scalar`, mismo omitEchoedInput): acá solo se decide DÓNDE vive el
 * registro, no cómo se lee cada llamada.
 */
export function TracePanel({ messages }: { messages: ChatAgentUIMessage[] }) {
  const toolParts = messages.flatMap(message =>
    message.parts.filter(part => part.type.startsWith('tool-')),
  ) as GenericToolPart[];

  return (
    <div className="flex h-full flex-col border-l border-sunken bg-paper">
      <div className="flex shrink-0 items-baseline gap-2 px-4 py-4 font-mono text-[13px] leading-[1.45]">
        <span className="font-medium text-ink-2">traza</span>
        {toolParts.length > 0 && <span className="text-ink-3">{toolParts.length}</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {toolParts.length === 0 ? (
          <p className="font-mono text-[13px] leading-[1.45] text-ink-3">sin tool calls todavía</p>
        ) : (
          <div className="flex flex-col gap-3">
            {toolParts.map((part, index) => (
              <div key={part.toolCallId ?? index} className="relative pl-3">
                {index !== toolParts.length - 1 && (
                  <div className="absolute top-3 bottom-[-12px] left-0 w-px bg-sunken" aria-hidden />
                )}
                <div className="absolute top-[9px] left-[-2px] h-[5px] w-[5px] rounded-full bg-ink-3" aria-hidden />
                <ToolTrace part={part} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
