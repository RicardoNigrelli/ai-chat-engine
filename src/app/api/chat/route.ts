import { createAgentUIStreamResponse, UIMessage } from 'ai';
import { chatAgent } from '@/lib/ai/agents/chatAgent';
import { describeAgentError } from '@/lib/ai/errors';
import { checkRateLimit } from '@/lib/ai/rateLimit';

export const maxDuration = 60;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Demasiados mensajes. Espera un momento antes de volver a escribir.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfterSeconds ?? 60),
        },
      }
    );
  }

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
