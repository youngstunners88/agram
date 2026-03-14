import { NextRequest, NextResponse } from "next/server";

const rateLimits = new Map<string, { count: number; resetTime: number }>();

const LIMITS: Record<string, { limit: number; window: number }> = {
  signals: { limit: 10, window: 60 },
  messages: { limit: 30, window: 60 },
  agents: { limit: 5, window: 3600 },
  search: { limit: 60, window: 60 },
};

export function checkRateLimit(key: string, type: string) {
  const config = LIMITS[type] || { limit: 100, window: 60 };
  const now = Date.now();
  const windowMs = config.window * 1000;
  
  const current = rateLimits.get(key);
  if (!current || now > current.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: config.limit - 1 };
  }
  
  if (current.count >= config.limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((current.resetTime - now) / 1000) };
  }
  
  current.count++;
  return { allowed: true, remaining: config.limit - current.count };
}

export function rateLimitMiddleware(request: NextRequest, type: string) {
  const key = request.headers.get("x-agent-id") || "anonymous";
  const result = checkRateLimit(key, type);
  
  if (!result.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { 
      status: 429, 
      headers: {
        "X-RateLimit-Limit": String(LIMITS[type]?.limit || 100),
        "X-RateLimit-Remaining": "0",
        "Retry-After": String(result.retryAfter),
      }
    });
  }
  
  return null;
}
