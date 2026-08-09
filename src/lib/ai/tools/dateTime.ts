import { tool } from 'ai';
import { z } from 'zod';

/**
 * Los LLM no tienen noción confiable de "ahora". Esta tool le da al agente
 * la fecha/hora real y le permite convertir entre timezones.
 */
export const currentDateTimeTool = tool({
  description:
    'Devuelve la fecha y hora actual, opcionalmente en una timezone específica (formato IANA, ej: "America/Argentina/Buenos_Aires"). Usala antes de responder cualquier pregunta que dependa de la fecha/hora de hoy.',
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe('Timezone IANA opcional, ej: "America/Mexico_City". Default: UTC.'),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    try {
      const formatted = new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'full',
        timeStyle: 'long',
        timeZone: timezone ?? 'UTC',
      }).format(now);
      return { iso: now.toISOString(), formatted, timezone: timezone ?? 'UTC' };
    } catch {
      return { iso: now.toISOString(), formatted: now.toISOString(), timezone: 'UTC', warning: 'timezone inválida, se usó UTC' };
    }
  },
});
