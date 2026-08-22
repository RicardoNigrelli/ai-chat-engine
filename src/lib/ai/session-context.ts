import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Propaga el `sessionId` del visitante (header `x-session-id`, ver
 * /api/chat/route.ts) a través de toda la cadena async del agente sin tener
 * que agregarlo como parámetro en cada capa (agente, registro de tools,
 * `tool.execute`). `knowledgeBaseTool` lo lee acá para saber qué documentos
 * de sesión (ver rag/sessionStore.ts) sumar a la búsqueda.
 */
const storage = new AsyncLocalStorage<string | undefined>();

export function runWithSession<T>(sessionId: string | undefined, fn: () => T): T {
  return storage.run(sessionId, fn);
}

export function getSessionId(): string | undefined {
  return storage.getStore();
}
