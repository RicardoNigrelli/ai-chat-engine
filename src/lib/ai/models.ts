import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * Registro central de modelos disponibles para el motor de chat.
 *
 * Dos proveedores, ambos gratis para probar:
 *  - OpenRouter: una key, cientos de modelos, variantes ":free".
 *  - OpenCode Zen: gateway de opencode.ai, tiene modelos "-free" que no
 *    piden API key en absoluto.
 *
 * Cambiar de modelo = cambiar el `id` en CHAT_MODELS/CHAT_MODEL. Cada
 * entrada sabe a qué proveedor pertenece y si "piensa" (emite razonamiento
 * antes de responder), así que getChatModelConfig() rutea sola y arma el
 * providerOptions correcto.
 */

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// OpenCode Zen (https://opencode.ai/docs/zen/): los modelos "-free" no
// requieren apiKey (verificado: responden 200 sin Authorization header).
// Si en el futuro querés modelos pagos de Zen, seteá OPENCODE_ZEN_API_KEY.
export const opencodeZen = createOpenAICompatible({
  name: 'opencode-zen',
  baseURL: 'https://opencode.ai/zen/v1',
  apiKey: process.env.OPENCODE_ZEN_API_KEY,
});

export type ReasoningEffort = 'low' | 'medium' | 'high';

export type ChatModelOption = {
  id: string;
  provider: 'openrouter' | 'opencode-zen';
  label: string;
  description: string;
  /** Si el modelo emite razonamiento ("thinking") antes de responder. Verificado en vivo, no es una suposición por nombre. */
  thinking: boolean;
  /**
   * Nivel de esfuerzo de razonamiento por defecto. Solo tiene efecto real en
   * modelos `thinking: true` de OpenRouter: probado en vivo que "low" vs
   * "high" cambia de verdad los reasoning_tokens (6 vs 115 en gpt-oss-20b).
   * En OpenCode Zen probé el equivalente (`reasoning_effort`) y NO lo
   * respeta — los números salieron al revés (ruido, no un control real) —
   * así que para modelos de ese proveedor este campo se ignora a propósito.
   */
  effort?: ReasoningEffort;
};

// Curados a partir de modelos gratis con tool-calling verificado en vivo
// (se probó cada uno con un tool call real, no solo que la doc lo liste).
export const CHAT_MODELS: ChatModelOption[] = [
  {
    id: 'big-pickle',
    provider: 'opencode-zen',
    thinking: true,
    label: 'Big Pickle (OpenCode Zen, free)',
    description: 'Sin API key. Piensa antes de responder. Default recomendado.',
  },
  {
    id: 'laguna-s-2.1-free',
    provider: 'opencode-zen',
    thinking: false,
    label: 'Laguna S 2.1 (OpenCode Zen, free)',
    description: 'Sin API key. No piensa (responde directo) — más rápido para tools simples.',
  },
  {
    id: 'deepseek-v4-flash-free',
    provider: 'opencode-zen',
    thinking: true,
    label: 'DeepSeek V4 Flash (OpenCode Zen, free)',
    description: 'Sin API key. Piensa antes de responder, buena relación velocidad/calidad.',
  },
  {
    id: 'openai/gpt-oss-20b:free',
    provider: 'openrouter',
    thinking: true,
    effort: 'medium',
    label: 'GPT-OSS 20B (OpenRouter, free)',
    description: 'Piensa; effort configurable de verdad (low/medium/high). Requiere OPENROUTER_API_KEY.',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    provider: 'openrouter',
    thinking: false,
    label: 'Gemma 4 31B (OpenRouter, free)',
    description: 'No piensa, responde directo. Requiere OPENROUTER_API_KEY.',
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    provider: 'openrouter',
    thinking: true,
    effort: 'medium',
    label: 'Nemotron 3 Super 120B (OpenRouter, free)',
    description: 'Más grande y capaz, piensa; effort configurable. Requiere OPENROUTER_API_KEY.',
  },
];

// Modelo usado si no se especifica ninguno (env var o UI).
export const DEFAULT_CHAT_MODEL = process.env.CHAT_MODEL ?? CHAT_MODELS[0].id;

// Override global de esfuerzo (opcional): si lo seteás, pisa el `effort`
// por defecto de cualquier modelo OpenRouter thinking que uses.
const EFFORT_OVERRIDE = process.env.CHAT_EFFORT as ReasoningEffort | undefined;

function resolveOption(modelId: string): ChatModelOption {
  return CHAT_MODELS.find(m => m.id === modelId) ?? CHAT_MODELS[0];
}

/**
 * Devuelve el modelo + providerOptions listos para pasar a ToolLoopAgent
 * (acepta las mismas opciones que streamText). Es la forma recomendada de
 * obtener el modelo — ya viene con el effort correcto aplicado.
 */
export function getChatModelConfig(modelId: string = DEFAULT_CHAT_MODEL) {
  const option = resolveOption(modelId);
  const model = option.provider === 'opencode-zen' ? opencodeZen(option.id) : openrouter(option.id);

  const effort = EFFORT_OVERRIDE ?? option.effort;
  const providerOptions =
    option.provider === 'openrouter' && option.thinking && effort
      ? { openrouter: { reasoning: { effort } } }
      : undefined;

  return { model, providerOptions, option };
}

/** Atajo para cuando solo necesitás el modelo (sin providerOptions de effort). */
export function getChatModel(modelId: string = DEFAULT_CHAT_MODEL) {
  return getChatModelConfig(modelId).model;
}

// Los embeddings para RAG corren 100% local (ver lib/ai/rag/localEmbeddings.ts)
// vía transformers.js — así el motor completo (chat + RAG) queda gratis de
// punta a punta, sin ninguna API key obligatoria.
