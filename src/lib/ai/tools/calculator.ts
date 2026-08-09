import { tool } from 'ai';
import { z } from 'zod';
import { evaluate } from 'mathjs';

/**
 * Tool típica de agente: aritmética exacta. Los LLM son poco confiables
 * calculando a mano, así que delegamos en mathjs en vez de dejar que el
 * modelo "adivine" el resultado.
 */
export const calculatorTool = tool({
  description:
    'Evalúa una expresión matemática (aritmética, potencias, raíces, trigonometría, etc.) y devuelve el resultado exacto. Usala siempre que el usuario pida un cálculo en vez de estimarlo de memoria.',
  inputSchema: z.object({
    expression: z
      .string()
      .describe('Expresión matemática a evaluar, ej: "(12 + 8) * 3 / 2" o "sqrt(144)"'),
  }),
  execute: async ({ expression }) => {
    try {
      const result = evaluate(expression);
      return { expression, result: String(result) };
    } catch (error) {
      return { expression, error: `No se pudo evaluar la expresión: ${(error as Error).message}` };
    }
  },
});
