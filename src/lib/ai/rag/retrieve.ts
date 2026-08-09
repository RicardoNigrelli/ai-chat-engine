import { embedText } from './localEmbeddings';
import { getVectorStore } from './store';
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
