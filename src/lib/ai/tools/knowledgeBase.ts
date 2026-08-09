import { tool } from 'ai';
import { z } from 'zod';
import { retrieve } from '../rag';

/**
 * Tool de RAG: le da al agente acceso a lo que hayas ingestado con
 * `npm run ingest`. Es agnóstica al contenido — "de lo que sea" (docs
 * internos, políticas, transcripciones, código, lo que cargues).
 */
export const knowledgeBaseTool = tool({
  description:
    'Busca en la base de conocimiento interna (documentos que el usuario cargó previamente). Usala antes de responder preguntas sobre información propia/privada que no estaría en tu entrenamiento.',
  inputSchema: z.object({
    query: z.string().describe('Qué información buscar en la base de conocimiento'),
    topK: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ query, topK }) => {
    const results = await retrieve(query, topK);

    if (results.length === 0) {
      return { query, results: [], note: 'La base de conocimiento está vacía o no hay resultados relevantes.' };
    }

    return {
      query,
      results: results.map(r => ({
        source: r.metadata.source,
        score: Number(r.score.toFixed(3)),
        text: r.text,
      })),
    };
  },
});
