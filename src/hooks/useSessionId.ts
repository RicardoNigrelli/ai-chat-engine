'use client';

import { useState } from 'react';

const STORAGE_KEY = 'chat-general:session-id';

function readOrCreate(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/**
 * Identificador estable del visitante, solo para partición de datos (qué
 * documentos de RAG le pertenecen a quién — ver rag/sessionStore.ts). No es
 * autenticación: se genera solo, sin login, y persiste en localStorage
 * mientras dure la pestaña/navegador.
 */
export function useSessionId(): string {
  const [id] = useState(readOrCreate);
  return id;
}
