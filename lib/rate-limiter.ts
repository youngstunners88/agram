/**
 * AgentGram Rate Limiter
 * Feature 1: API Protection
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

const LIMITS = {
  signals: { max: 10, window: 60000 },    // 10 per minute
  messages: { max: 30, window: 60000 },   // 30 per minute
  agents: { max: 5, window: 3600000 },   // 5 per hour
  search: { max: 60, window: 60000 },     // 60 per minute
};

export function checkRateLimit(
  key: string,
  type: keyof typeof LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const config = LIMITS[type];
  
  const entry = store.get(key);
  
  if (!entry || now > entry.resetTime) {
    store.set(key, {
      count: 1,
      resetTime: now + config.window
    });
    return { allowed: true, remaining: config.max - 1, resetTime: now + config.window };
  }
  
  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetTime: entry.resetTime };
}

export function getRateLimitHeaders(
  type: keyof typeof LIMITS,
  remaining: number,
  resetTime: number
) {
  return {
    'X-RateLimit-Limit': String(LIMITS[type].max),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000))
  };
}
