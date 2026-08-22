import { cosineSimilarity } from 'ai';
import type { DocumentChunk, RetrievedChunk } from './types';

/**
 * Base de conocimiento por sesión: lo que un visitante carga desde la UI
 * (ver /api/knowledge/upload) vive acá, no en el `JsonFileVectorStore`
 * global de rag/store.ts — ese es el conocimiento curado por vos. Si
 * mezclara todo en un store compartido, lo que un visitante sube quedaría
 * buscable para CUALQUIER OTRO visitante — un problema real de privacidad,
 * no solo prolijidad.
 *
 * 100% en memoria (no hay disco escribible de forma confiable en Vercel de
 * todos modos) y con límites duros para que nadie pueda tirar abajo el
 * proceso ni inflar memoria sin límite:
 * - MAX_FILES_PER_SESSION documentos por sesión
 * - MAX_FILE_CHARS por documento
 * - MAX_SESSION_CHARS acumulados por sesión
 * - TTL deslizante: sin actividad, la sesión se borra sola
 */
export const MAX_FILES_PER_SESSION = 5;
export const MAX_FILE_CHARS = 20_000;
export const MAX_SESSION_CHARS = 60_000;
const TTL_MS = 60 * 60 * 1000; // 1 hora desde la última actividad

type SessionEntry = {
  chunks: DocumentChunk[];
  files: Map<string, number>; // filename -> chars, para los límites acumulados
  expiresAt: number;
};

const sessions = new Map<string, SessionEntry>();

function touch(entry: SessionEntry): void {
  entry.expiresAt = Date.now() + TTL_MS;
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (entry.expiresAt < now) sessions.delete(id);
  }
}

function getOrCreate(sessionId: string): SessionEntry {
  pruneExpired();
  let entry = sessions.get(sessionId);
  if (!entry) {
    entry = { chunks: [], files: new Map(), expiresAt: 0 };
    sessions.set(sessionId, entry);
  }
  touch(entry);
  return entry;
}

export class SessionLimitError extends Error {}

export function listSessionFiles(sessionId: string): Array<{ name: string; chars: number }> {
  const entry = sessions.get(sessionId);
  if (!entry || entry.expiresAt < Date.now()) return [];
  return Array.from(entry.files.entries()).map(([name, chars]) => ({ name, chars }));
}

export function upsertSessionDocument(
  sessionId: string,
  filename: string,
  chunks: DocumentChunk[],
  chars: number,
): void {
  const entry = getOrCreate(sessionId);

  if (!entry.files.has(filename) && entry.files.size >= MAX_FILES_PER_SESSION) {
    throw new SessionLimitError(`Máximo ${MAX_FILES_PER_SESSION} documentos por sesión.`);
  }

  const currentTotal = Array.from(entry.files.values()).reduce((a, b) => a + b, 0);
  const previousCharsForFile = entry.files.get(filename) ?? 0;
  const newTotal = currentTotal - previousCharsForFile + chars;
  if (newTotal > MAX_SESSION_CHARS) {
    throw new SessionLimitError(
      `Se pasa del límite de la sesión (${MAX_SESSION_CHARS.toLocaleString('es-AR')} caracteres en total).`,
    );
  }

  entry.chunks = entry.chunks.filter(c => c.metadata.source !== filename);
  entry.chunks.push(...chunks);
  entry.files.set(filename, chars);
}

export function removeSessionDocument(sessionId: string, filename: string): void {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  entry.chunks = entry.chunks.filter(c => c.metadata.source !== filename);
  entry.files.delete(filename);
  touch(entry);
}

export function querySessionStore(sessionId: string, embedding: number[], topK: number): RetrievedChunk[] {
  const entry = sessions.get(sessionId);
  if (!entry || entry.expiresAt < Date.now() || entry.chunks.length === 0) return [];
  touch(entry);
  return entry.chunks
    .map(chunk => ({ ...chunk, score: cosineSimilarity(embedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
