/**
 * Sliding-window rate limiter (client-side).
 * Previene ráfagas de escrituras/lecturas accidentales o abusivas.
 *
 * No reemplaza las reglas de Firestore, pero añade una capa extra
 * antes de que la petición salga del cliente.
 */
class RateLimiter {
  /**
   * @param {number} maxRequests  peticiones permitidas en la ventana
   * @param {number} windowMs     duración de la ventana en ms
   */
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.timestamps = new Map(); // key → number[]
  }

  /** Retorna true si la acción está permitida; false si excedió el límite. */
  isAllowed(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const history = (this.timestamps.get(key) || []).filter(t => t > windowStart);

    if (history.length >= this.maxRequests) return false;

    history.push(now);
    this.timestamps.set(key, history);
    return true;
  }

  /** Reinicia el contador de una clave (p.ej. tras login exitoso). */
  reset(key = 'default') {
    this.timestamps.delete(key);
  }

  /** Tiempo en ms hasta que la clave vuelva a estar permitida. */
  retryAfterMs(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const history = (this.timestamps.get(key) || []).filter(t => t > windowStart);
    if (history.length < this.maxRequests) return 0;
    const oldest = history[0];
    return oldest + this.windowMs - now;
  }
}

// ── Instancias de uso global ────────────────────────────────────────────────

/** Escrituras a Firestore: máx. 30 por minuto por sesión. */
export const writeRateLimiter = new RateLimiter(30, 60_000);

/** Intentos de autenticación: máx. 5 cada 5 minutos. */
export const authRateLimiter = new RateLimiter(5, 5 * 60_000);

/** Búsquedas/lecturas pesadas: máx. 60 por minuto. */
export const readRateLimiter = new RateLimiter(60, 60_000);

/**
 * Envuelve una función async y lanza un error si supera el rate limit.
 *
 * @param {Function} fn          la función a ejecutar
 * @param {RateLimiter} limiter  el limitador a usar
 * @param {string} key           clave de agrupación (p.ej. uid del usuario)
 * @returns {Function}           función envuelta
 */
export function withRateLimit(fn, limiter, key = 'default') {
  return async (...args) => {
    if (!limiter.isAllowed(key)) {
      const wait = Math.ceil(limiter.retryAfterMs(key) / 1000);
      throw new Error(`Demasiadas solicitudes. Intenta de nuevo en ${wait}s.`);
    }
    return fn(...args);
  };
}
