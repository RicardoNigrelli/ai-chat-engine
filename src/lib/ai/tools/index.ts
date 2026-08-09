import { calculatorTool } from './calculator';
import { currentDateTimeTool } from './dateTime';
import { readWebPageTool } from './webPage';
import { webSearchTool } from './webSearch';
import { knowledgeBaseTool } from './knowledgeBase';

/**
 * Registro central de tools del agente. Para agregar una tool nueva:
 *   1. Creá src/lib/ai/tools/mi-tool.ts exportando un `tool({...})` de la AI SDK.
 *   2. Importala y agregala acá con el nombre que quieras que use el modelo.
 * No hay que tocar el agente, la ruta de chat ni la UI — todos leen de este registro.
 */
export const tools = {
  calculator: calculatorTool,
  currentDateTime: currentDateTimeTool,
  readWebPage: readWebPageTool,
  webSearch: webSearchTool,
  knowledgeBaseSearch: knowledgeBaseTool,
};

export type ChatTools = typeof tools;
