import { ToolLoopAgent, isStepCount, InferAgentUIMessage } from 'ai';
import { getChatModelConfig } from '../models';
import { tools } from '../tools';

const SYSTEM_INSTRUCTIONS = `Sos un asistente de IA general, útil y directo.

- Usá las tools disponibles cuando corresponda en vez de adivinar: cálculos exactos, fecha/hora actual, lectura de páginas web, búsqueda web y búsqueda en la base de conocimiento interna.
- Antes de decir "no tengo esa información" o de asumir que algo es un dato del mundo real que no conocés, probá knowledgeBaseSearch — el usuario puede haber subido un documento en esta misma conversación con exactamente esa respuesta (nombres, códigos, horarios, datos de una empresa/persona específica que no estarían en tu entrenamiento). Es una búsqueda barata: mejor probarla y no encontrar nada que responder sin buscar.
- Si usás la base de conocimiento (knowledgeBaseSearch) y encontrás información relevante, citá de qué documento (source) sale.
- Si una tool falla o no está configurada, decíselo al usuario en vez de inventar una respuesta.
- Respondé en el idioma en el que te escriben.`;

/**
 * Agente de chat de referencia del motor. Es intencionalmente genérico —
 * "un asistente" — para que sirva como base en múltiples aplicaciones.
 * Para una app específica, cloná este archivo (o parametrizá instructions/
 * tools/model) en vez de mutar este default compartido.
 */
const { model, providerOptions } = getChatModelConfig();

export const chatAgent = new ToolLoopAgent({
  model,
  providerOptions,
  instructions: SYSTEM_INSTRUCTIONS,
  tools,
  stopWhen: isStepCount(20),
});

export type ChatAgentUIMessage = InferAgentUIMessage<typeof chatAgent>;
