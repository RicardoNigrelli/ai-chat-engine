import {
  chunkText,
  embedTexts,
  listSessionFiles,
  MAX_FILE_CHARS,
  MAX_FILES_PER_SESSION,
  MAX_SESSION_CHARS,
  removeSessionDocument,
  SessionLimitError,
  upsertSessionDocument,
} from '@/lib/ai/rag';
import { checkUploadRateLimit } from '@/lib/ai/rateLimit';
import type { DocumentChunk } from '@/lib/ai/rag/types';

/**
 * Sube un documento de texto a la base de conocimiento de ESTA sesión (ver
 * rag/sessionStore.ts — no es global, no se comparte entre visitantes).
 * Solo texto plano: nada de parseo de PDF/binarios, así se mantiene chico el
 * costo y la superficie de ataque de una demo pública.
 */
export async function POST(request: Request) {
  const rateLimit = checkUploadRateLimit(request);
  if (!rateLimit.allowed) {
    return jsonError('Demasiadas subidas. Esperá un momento.', 429, {
      'Retry-After': String(rateLimit.retryAfterSeconds ?? 60),
    });
  }

  const sessionId = request.headers.get('x-session-id');
  if (!sessionId) return jsonError('Falta x-session-id.', 400);

  let body: { filename?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Body inválido.', 400);
  }

  const filename = (body.filename ?? '').trim().slice(0, 200);
  const text = body.text ?? '';

  if (!filename) return jsonError('Falta el nombre del archivo.', 400);
  if (!/\.(txt|md)$/i.test(filename)) {
    return jsonError('Solo se aceptan archivos .txt o .md — texto plano.', 400);
  }
  if (!text.trim()) return jsonError('El archivo está vacío.', 400);
  if (text.length > MAX_FILE_CHARS) {
    return jsonError(
      `Archivo demasiado grande: ${text.length.toLocaleString('es-AR')} caracteres, máximo ${MAX_FILE_CHARS.toLocaleString('es-AR')}.`,
      400,
    );
  }

  try {
    // `embedTexts` corre en el mismo proceso (transformers.js local, ver
    // rag/localEmbeddings.ts) — nada sale a ninguna API externa con el
    // contenido que sube el visitante.
    const pieces = chunkText(text);
    const embeddings = await embedTexts(pieces);
    const chunks: DocumentChunk[] = pieces.map((chunkedText, i) => ({
      id: `session::${filename}::${i}`,
      text: chunkedText,
      embedding: embeddings[i],
      metadata: { source: filename, chunkIndex: i },
    }));

    upsertSessionDocument(sessionId, filename, chunks, text.length);

    return Response.json({ files: listSessionFiles(sessionId) });
  } catch (error) {
    if (error instanceof SessionLimitError) {
      return jsonError(error.message, 400);
    }
    console.error('[api/knowledge/upload]', error);
    return jsonError('No se pudo procesar el archivo.', 500);
  }
}

export async function GET(request: Request) {
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId) return jsonError('Falta x-session-id.', 400);
  return Response.json({
    files: listSessionFiles(sessionId),
    limits: { MAX_FILES_PER_SESSION, MAX_FILE_CHARS, MAX_SESSION_CHARS },
  });
}

export async function DELETE(request: Request) {
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId) return jsonError('Falta x-session-id.', 400);

  const { filename } = (await request.json().catch(() => ({}))) as { filename?: string };
  if (!filename) return jsonError('Falta el nombre del archivo.', 400);

  removeSessionDocument(sessionId, filename);
  return Response.json({ files: listSessionFiles(sessionId) });
}

function jsonError(message: string, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
