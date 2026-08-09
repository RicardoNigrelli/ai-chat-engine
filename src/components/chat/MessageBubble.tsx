'use client';

import ReactMarkdown from 'react-markdown';
import type { ChatAgentUIMessage } from '@/lib/ai/agents/chatAgent';
import { ToolPart } from './ToolPart';

export function MessageBubble({ message }: { message: ChatAgentUIMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        }`}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <div key={index} className="space-y-2 [&_p]:whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-white/10 [&_a]:underline [&_a]:underline-offset-2">
                <ReactMarkdown>{part.text}</ReactMarkdown>
              </div>
            );
          }

          if (part.type.startsWith('tool-')) {
            return <ToolPart key={index} part={part as never} />;
          }

          if (part.type === 'reasoning') {
            return (
              <p key={index} className="whitespace-pre-wrap text-xs italic text-zinc-400">
                {part.text}
              </p>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
