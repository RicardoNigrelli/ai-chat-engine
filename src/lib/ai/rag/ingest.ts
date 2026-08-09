import { chunkText } from './chunk';
import { embedTexts } from './localEmbeddings';
import { getVectorStore } from './store';
import type { DocumentChunk } from './types';

/**
 * Ingesta un texto (documento, transcripción, artículo, lo que sea) a la
 * base de conocimiento: lo chunkea, genera embeddings y lo guarda en el
 * vector store configurado. `source` identifica el documento (nombre de
 * archivo, URL, id) y se usa para poder borrar/reemplazar después.
 */
export async function ingestText(
  text: string,
  source: string,
  metadata: Record<string, unknown> = {},
): Promise<{ chunks: number }> {
  const pieces = chunkText(text);
  if (pieces.length === 0) return { chunks: 0 };

  const embeddings = await embedTexts(pieces);

  const chunks: DocumentChunk[] = pieces.map((text, i) => ({
    id: `${source}::${i}`,
    text,
    embedding: embeddings[i],
    metadata: { source, chunkIndex: i, ...metadata },
  }));

  const store = getVectorStore();
  await store.clear(source); // reemplaza versiones previas del mismo source
  await store.upsert(chunks);

  return { chunks: chunks.length };
}
