import { cosineSimilarity } from 'ai';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DocumentChunk, RetrievedChunk, VectorStore } from './types';

const DEFAULT_PATH = path.join(process.cwd(), 'data', 'vector-store.json');

/**
 * Vector store de archivo local: guarda todos los chunks + embeddings en un
 * JSON. Suficiente para prototipos y bases de conocimiento chicas/medianas
 * (miles de chunks). Cuando el volumen crezca o necesites multi-instancia,
 * implementá `VectorStore` contra pgvector/Upstash/Pinecone y reemplazá
 * `getVectorStore()` sin tocar el resto del código.
 */
class JsonFileVectorStore implements VectorStore {
  constructor(private filePath: string = DEFAULT_PATH) {}

  private async readAll(): Promise<DocumentChunk[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as DocumentChunk[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeAll(chunks: DocumentChunk[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(chunks), 'utf-8');
  }

  async upsert(newChunks: DocumentChunk[]): Promise<void> {
    const existing = await this.readAll();
    const bySource = new Map(existing.map(c => [c.id, c]));
    for (const chunk of newChunks) bySource.set(chunk.id, chunk);
    await this.writeAll(Array.from(bySource.values()));
  }

  async query(embedding: number[], topK: number): Promise<RetrievedChunk[]> {
    const all = await this.readAll();
    return all
      .map(chunk => ({ ...chunk, score: cosineSimilarity(embedding, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async clear(source?: string): Promise<void> {
    if (!source) {
      await this.writeAll([]);
      return;
    }
    const existing = await this.readAll();
    await this.writeAll(existing.filter(c => c.metadata.source !== source));
  }
}

let store: VectorStore | undefined;

export function getVectorStore(): VectorStore {
  if (!store) store = new JsonFileVectorStore();
  return store;
}
