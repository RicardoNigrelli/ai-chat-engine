/**
 * Rate limit simple en memoria, por IP, para /api/chat.
 *
 * No es a prueba de balas en serverless (cada instancia de Vercel puede
 * tener su propio contador si el trafico se reparte entre varias), pero
 * frena el abuso casual/scripteado sin agregar Redis/KV a un proyecto de
 * portafolio que no los necesita para nada mas.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const hits = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function checkRateLimit(request: Request): { allowed: boolean; retryAfterSeconds?: number } {
  const ip = getClientIp(request);
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const recent = (hits.get(ip) ?? []).filter(t => t > windowStart);

  if (recent.length >= MAX_REQUESTS) {
    const oldestInWindow = recent[0];
    const retryAfterSeconds = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
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
}
