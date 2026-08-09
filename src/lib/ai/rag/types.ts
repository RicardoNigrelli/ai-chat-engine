export type DocumentChunk = {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    source: string;
    chunkIndex: number;
    [key: string]: unknown;
  };
};

export type RetrievedChunk = DocumentChunk & {
  score: number;
};

/**
 * Contrato mínimo para un vector store. La implementación por defecto
 * (`JsonFileVectorStore`) guarda todo en un archivo JSON local para que el
 * prototipo funcione sin infraestructura extra. Para producción, implementá
 * esta misma interfaz contra pgvector, Upstash Vector, Pinecone, etc. y
 * cambiá el store en `lib/ai/rag/store.ts` sin tocar tools ni el agente.
 */
export interface VectorStore {
  upsert(chunks: DocumentChunk[]): Promise<void>;
  query(embedding: number[], topK: number): Promise<RetrievedChunk[]>;
  clear(source?: string): Promise<void>;
}
