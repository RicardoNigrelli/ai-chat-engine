'use client';

import { useEffect, useRef, useState } from 'react';

type SessionFile = { name: string; chars: number };

const MAX_FILE_CHARS = 20_000;
const MAX_SESSION_CHARS = 60_000;
const MAX_FILES = 5;

/**
 * Carga de documentos a la base de conocimiento de ESTA sesión (ver
 * /api/knowledge/upload). Solo .txt/.md — nada de parseo de binarios. Los
 * límites (tamaño por archivo, total por sesión, cantidad de archivos) se
 * aplican tanto acá para feedback inmediato como en el server, que es la
 * fuente de verdad real.
 */
export function KnowledgeUpload({ sessionId }: { sessionId: string }) {
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch('/api/knowledge/upload', { headers: { 'x-session-id': sessionId } })
      .then(r => (r.ok ? r.json() : null))
      .then(data => data && setFiles(data.files))
      .catch(() => {});
  }, [sessionId]);

  const totalChars = files.reduce((sum, f) => sum + f.chars, 0);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !sessionId) return;
    setError('');

    for (const file of Array.from(fileList)) {
      if (!/\.(txt|md)$/i.test(file.name)) {
        setError(`${file.name}: solo se aceptan .txt o .md`);
        continue;
      }
      if (file.size > MAX_FILE_CHARS * 2) {
        // Chequeo rápido por bytes antes de leer el archivo entero — el
        // límite real es por caracteres, ver abajo, pero esto corta archivos
        // obviamente enormes sin siquiera leerlos.
        setError(`${file.name}: demasiado grande`);
        continue;
      }

      const text = await file.text();
      if (text.length > MAX_FILE_CHARS) {
        setError(`${file.name}: ${text.length.toLocaleString('es-AR')} caracteres, máximo ${MAX_FILE_CHARS.toLocaleString('es-AR')}`);
        continue;
      }

      setUploading(true);
      try {
        const res = await fetch('/api/knowledge/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
          body: JSON.stringify({ filename: file.name, text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'No se pudo subir el archivo.');
        } else {
          setFiles(data.files);
        }
      } catch {
        setError('Error de red al subir el archivo.');
      } finally {
        setUploading(false);
      }
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = async (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name)); // optimista
    try {
      const res = await fetch('/api/knowledge/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ filename: name }),
      });
      const data = await res.json();
      if (res.ok) setFiles(data.files);
    } catch {
      // Best effort: si falla, el próximo GET (reload) corrige la lista.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-[13px] leading-[1.45]">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,text/plain"
        multiple
        className="hidden"
        onChange={event => handleFiles(event.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || files.length >= MAX_FILES}
        className="rounded-[3px] border border-sunken px-2 py-1 text-ink-2 hover:bg-sunken disabled:opacity-40"
        title={files.length >= MAX_FILES ? `Máximo ${MAX_FILES} documentos por sesión` : 'Subir un documento .txt/.md a la base de conocimiento de esta sesión'}
      >
        {uploading ? 'subiendo…' : '+ conocimiento'}
      </button>

      {files.map(file => (
        <span key={file.name} className="inline-flex items-center gap-1.5 rounded-[3px] bg-sunken px-2 py-1 text-ink-2">
          {file.name}
          <span className="text-ink-3">{file.chars.toLocaleString('es-AR')}c</span>
          <button
            type="button"
            onClick={() => handleRemove(file.name)}
            aria-label={`Quitar ${file.name}`}
            className="text-ink-3 hover:text-ink"
          >
            ×
          </button>
        </span>
      ))}

      {files.length > 0 && (
        <span className="text-ink-3">
          {totalChars.toLocaleString('es-AR')}/{MAX_SESSION_CHARS.toLocaleString('es-AR')}c
        </span>
      )}

      {error && <span className="text-warn">{error}</span>}
    </div>
  );
}
