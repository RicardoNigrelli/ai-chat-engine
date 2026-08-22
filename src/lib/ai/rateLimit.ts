/**
 * Rate limit simple en memoria, por IP.
 *
 * No es a prueba de balas en serverless (cada instancia de Vercel puede
 * tener su propio contador si el trafico se reparte entre varias), pero
 * frena el abuso casual/scripteado sin agregar Redis/KV a un proyecto de
 * portafolio que no los necesita para nada mas.
 */

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  return function check(request: Request): { allowed: boolean; retryAfterSeconds?: number } {
    const ip = getClientIp(request);
    const now = Date.now();
    const windowStart = now - windowMs;

    const recent = (hits.get(ip) ?? []).filter(t => t > windowStart);

    if (recent.length >= max) {
      const oldestInWindow = recent[0];
      const retryAfterSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    recent.push(now);
    hits.set(ip, recent);

    // Poda ocasional para no crecer sin limite en una instancia longeva.
    if (hits.size > 5000) {
      for (const [key, timestamps] of hits) {
        if (timestamps.every(t => t <= windowStart)) hits.delete(key);
      }
    }

    return { allowed: true };
  };
}

/** /api/chat — una pregunta cada tanto es normal, 10/min frena scripts. */
export const checkRateLimit = createRateLimiter({ windowMs: 60_000, max: 10 });

/** /api/knowledge/upload — subir documentos es una acción esporádica, no
 * algo que un uso normal repita todo el tiempo; límite más chico. */
export const checkUploadRateLimit = createRateLimiter({ windowMs: 10 * 60_000, max: 8 });
