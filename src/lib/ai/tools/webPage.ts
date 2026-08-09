import { tool } from 'ai';
import { z } from 'zod';
import { safeFetch, describeBlockedCause } from '../net/safeFetch';

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tool típica de agente: leer una URL puntual (a diferencia de webSearch,
 * que busca). Es la tool más expuesta del motor, porque la URL la elige quien
 * escribe en el chat: todo el control de SSRF vive en `lib/ai/net/safeFetch`.
 */
export const readWebPageTool = tool({
  description:
    'Descarga una URL pública y devuelve su contenido como texto plano (sin HTML). Usala cuando el usuario te pase un link o cuando webSearch te devuelva una URL que necesitás leer en detalle.',
  inputSchema: z.object({
    url: z.string().url().describe('URL completa a leer, ej: "https://ejemplo.com/articulo"'),
  }),
  execute: async ({ url }) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { url, error: 'URL inválida' };
    }

    // Un solo presupuesto de tiempo para toda la cadena de redirecciones, no
    // 10s por salto.
    const signal = AbortSignal.timeout(10_000);

    try {
      const result = await safeFetch(parsed, signal, { 'User-Agent': 'chat-general-bot/1.0' });
      if ('error' in result) return { url, error: result.error };

      const { response, finalUrl } = result;
      if (!response.ok) {
        return { url, error: `Respuesta HTTP ${response.status}` };
      }

      const contentType = response.headers.get('content-type') ?? '';
      const raw = await response.text();
      const text = contentType.includes('html') ? htmlToText(raw) : raw;

      return {
        url,
        // Si hubo redirecciones, el modelo debería saber qué terminó leyendo.
        ...(finalUrl.href !== parsed.href ? { finalUrl: finalUrl.href } : {}),
        content: text.slice(0, 8000),
      };
    } catch (error) {
      const blocked = describeBlockedCause(error);
      if (blocked) return { url, error: `No se permite acceder a esta URL: ${blocked}` };
      return { url, error: `No se pudo descargar la URL: ${(error as Error).message}` };
    }
  },
});
