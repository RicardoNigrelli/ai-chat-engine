import { createAgentUIStreamResponse, UIMessage } from 'ai';
import { chatAgent } from '@/lib/ai/agents/chatAgent';
import { describeAgentError } from '@/lib/ai/errors';

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  return createAgentUIStreamResponse({
    agent: chatAgent,
    uiMessages: messages,
    onError: error => {
      // El detalle completo queda en los logs del servidor; al cliente le
      // mandamos una versión traducida y accionable (ver describeAgentError).
      console.error('[api/chat]', error);
      return describeAgentError(error);
    },
  });
}
