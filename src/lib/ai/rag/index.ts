export { ingestText } from './ingest';
export { retrieve, retrieveMerged } from './retrieve';
export { getVectorStore } from './store';
export { chunkText } from './chunk';
export { embedTexts } from './localEmbeddings';
export {
  upsertSessionDocument,
  removeSessionDocument,
  listSessionFiles,
  SessionLimitError,
  MAX_FILES_PER_SESSION,
  MAX_FILE_CHARS,
  MAX_SESSION_CHARS,
} from './sessionStore';
export type { DocumentChunk, RetrievedChunk, VectorStore } from './types';
