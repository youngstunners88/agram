/**
 * AgentGram Rate Limiter
 * Feature 1: API Protection with automatic cleanup
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

const LIMITS = {
  signals: { max: 10, window: 60000 },    // 10 per minute
  messages: { max: 30, window: 60000 },   // 30 per minute
  agents: { max: 5, window: 3600000 },    // 5 per hour
  search: { max: 60, window: 60000 },    // 60 per minute
  default: { max: 100, window: 60000 },  // 100 per minute default
};

export type RateLimitType = keyof typeof LIMITS;

// Cleanup function to prevent memory leaks
function cleanupOldEntries() {
  const now = Date.now();
  let cleaned = 0;
  const entries = Array.from(store.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetTime) {
      store.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`);
  }
}

// Start cleanup interval
setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

export function checkRateLimit(
  key: string,
  type: RateLimitType = "default"
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
  type: RateLimitType,
  remaining: number,
  resetTime: number
) {
  const config = LIMITS[type];
  return {
    'X-RateLimit-Limit': String(config.max),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000))
  };
}

// Get current store size for monitoring
export function getRateLimiterStats() {
  return {
    entries: store.size,
    nextCleanup: CLEANUP_INTERVAL,
  };
}

// Reset limit for a specific key (useful for testing)
export function resetRateLimit(key: string) {
  store.delete(key);
}
