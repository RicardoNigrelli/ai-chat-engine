import { APICallError, LoadAPIKeyError, RetryError } from 'ai';

/**
 * Traduce cualquier error que pueda tirar el agente a un mensaje entendible
 * para mostrar en el chat. Sin esto, la AI SDK devuelve "An error occurred."
 * para todo por defecto (medida de seguridad genérica para no filtrar datos
 * internos), lo cual no alcanza acá: es un proyecto propio, no un SaaS
 * multi-tenant, así que priorizamos que el usuario sepa qué pasó y qué hacer.
 *
 * Se usa como `onError` en createAgentUIStreamResponse (ver app/api/chat/route.ts).
 */
export function describeAgentError(error: unknown): string {
  // Los reintentos fallidos envuelven la causa real en un RetryError.
  const cause = RetryError.isInstance(error) ? error.lastError : error;

  if (LoadAPIKeyError.isInstance(cause)) {
    return `Falta configurar una API key. Revisá tu .env.local. (${cause.message})`;
  }

  if (APICallError.isInstance(cause)) {
    if (cause.statusCode === 429) {
      return 'El modelo elegido está saturado ahora mismo (límite del proveedor gratis). Probá de nuevo en unos segundos, o cambiá CHAT_MODEL a otro de la lista.';
    }
    if (cause.statusCode === 401 || cause.statusCode === 403) {
      return `La API key configurada fue rechazada por el proveedor (${cause.statusCode}). Revisá que sea válida y no haya expirado.`;
    }
    if (cause.statusCode === 402) {
      return 'El proveedor rechazó la solicitud por falta de crédito (402). Cargá saldo o cambiá a un modelo gratis en CHAT_MODEL.';
    }
    if (/certificate|unable to verify/i.test(cause.message)) {
      return 'No se pudo verificar el certificado TLS al conectar con el proveedor. En Windows con antivirus, confirmá que NODE_OPTIONS=--use-system-ca esté activo (ver scripts en package.json).';
    }
    return `El proveedor de IA devolvió un error${cause.statusCode ? ` (${cause.statusCode})` : ''}: ${cause.message}`;
  }

  if (cause instanceof Error) {
    if (/fetch failed|econnrefused|network/i.test(cause.message)) {
      return 'No se pudo conectar con el proveedor de IA. Revisá tu conexión a internet.';
    }
    return `Error inesperado: ${cause.message}`;
  }

  return 'Ocurrió un error inesperado. Revisá los logs del servidor (`npm run dev`) para más detalle.';
}
