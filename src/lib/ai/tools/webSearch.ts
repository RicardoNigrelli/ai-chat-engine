import { tool } from 'ai';
import { z } from 'zod';

type TavilyResult = {
  results: { title: string; url: string; content: string }[];
};

/**
 * Tool típica de agente: búsqueda web. Usa Tavily (pensado para agentes IA)
 * porque devuelve snippets ya limpios en vez de HTML de una SERP. Requiere
 * TAVILY_API_KEY (gratis para empezar en tavily.com). Si no hay key
 * configurada, la tool responde con un error claro en vez de fallar en
 * silencio o inventar resultados falsos.
 *
 * Para cambiar de proveedor (Serper, Brave Search, Exa, etc.) alcanza con
 * reescribir el `execute` de esta tool: el resto del motor no depende de
 * Tavily en particular.
 */
export const webSearchTool = tool({
  description:
    'Busca en la web información actual (noticias, precios, datos que cambian con el tiempo, cualquier cosa que no sepas con certeza). Devuelve una lista de resultados con título, URL y un resumen.',
  inputSchema: z.object({
    query: z.string().describe('Términos de búsqueda'),
    maxResults: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ query, maxResults }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return {
        query,
        error:
          'webSearch no está configurada: falta TAVILY_API_KEY en las variables de entorno. Avisale al usuario en vez de inventar resultados.',
      };
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
        }),
      });

      if (!response.ok) {
        return { query, error: `Búsqueda falló con status ${response.status}` };
      }

      const data = (await response.json()) as TavilyResult;
      return {
        query,
        results: data.results.map(r => ({ title: r.title, url: r.url, snippet: r.content })),
      };
    } catch (error) {
      return { query, error: `No se pudo completar la búsqueda: ${(error as Error).message}` };
    }
  },
});
