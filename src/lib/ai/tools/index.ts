import type { Tool } from 'ai';
import { calculatorTool } from './calculator';
import { currentDateTimeTool } from './dateTime';
import { readWebPageTool } from './webPage';
import { webSearchTool } from './webSearch';
import { knowledgeBaseTool } from './knowledgeBase';

/**
 * Mide cuánto tarda la tool **donde efectivamente corre**: el servidor.
 *
 * La traza de la UI lo intentaba desde el cliente, cronometrando entre la
 * llegada del input y la del output por el stream. No funciona: el servidor
 * ejecuta la tool y descarga ambas partes en el mismo flush, así que el
 * cliente medía ~0 incluso para `readWebPage`, que descarga una página entera.
 * El único lugar donde el número existe es acá.
 *
 * El valor viaja en `_elapsedMs` dentro del output. El guión bajo lo marca
 * como metadato: `ToolTrace` lo saca de las filas y lo muestra en la cabecera.
 */
function timed<T extends Tool>(t: T): T {
  const original = t.execute;
  if (!original) return t;

  return {
    ...t,
    execute: async (input: never, options: never) => {
      const start = Date.now();
      const result = await original(input, options);
      const elapsedMs = Date.now() - start;

      // Solo se puede anotar un output con forma de objeto. Nuestras tools
      // devuelven objetos, pero no queremos que una tool futura que devuelva
      // un string o un array rompa por esto.
      if (result == null || typeof result !== 'object' || Array.isArray(result)) {
        return result;
      }
      return { ...result, _elapsedMs: elapsedMs };
    },
  } as T;
}

/**
 * Registro central de tools del agente. Para agregar una tool nueva:
 *   1. Creá src/lib/ai/tools/mi-tool.ts exportando un `tool({...})` de la AI SDK.
 *   2. Importala y agregala acá con el nombre que quieras que use el modelo.
 * No hay que tocar el agente, la ruta de chat ni la UI — todos leen de este
 * registro, y el cronometrado se aplica solo.
 */
export const tools = {
  calculator: timed(calculatorTool),
  currentDateTime: timed(currentDateTimeTool),
  readWebPage: timed(readWebPageTool),
  webSearch: timed(webSearchTool),
  knowledgeBaseSearch: timed(knowledgeBaseTool),
};

export type ChatTools = typeof tools;
