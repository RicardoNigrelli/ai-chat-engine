import { embedText } from './localEmbeddings';
import { getVectorStore } from './store';
import { querySessionStore } from './sessionStore';
import type { RetrievedChunk } from './types';

/**
 * Busca en la base de conocimiento los chunks más relevantes para una query.
 * Usado por la tool `knowledgeBaseSearch` y reusable directamente desde
 * código de servidor si necesitás RAG fuera del loop del agente.
 */
export async function retrieve(query: string, topK = 5): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query);
  const store = getVectorStore();
  return store.query(embedding, topK);
}

/**
 * Igual que `retrieve`, pero suma (si hay `sessionId`) los documentos que el
 * visitante cargó en esta sesión — ver rag/sessionStore.ts. Un solo embedding
 * de la query, se consulta contra los dos stores y se mezcla por score.
 */
export async function retrieveMerged(
  query: string,
  topK: number,
  sessionId: string | undefined,
): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query);
  const store = getVectorStore();
  const [base, session] = await Promise.all([
    store.query(embedding, topK),
    Promise.resolve(sessionId ? querySessionStore(sessionId, embedding, topK) : []),
  ]);
  return [...base, ...session].sort((a, b) => b.score - a.score).slice(0, topK);
}
