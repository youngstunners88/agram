/**
 * API Middleware - Shared validation, auth, rate limiting, and logging
 *
 * Wraps route handlers with security checks so individual routes
 * don't need to duplicate this logic.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAgent } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import { sanitizeInput, containsXss, validateRequestBody } from "@/lib/security";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";

type RateLimitType = "signals" | "messages" | "agents" | "search";

type HandlerContext = {
  body: Record<string, unknown>;
  agentId: string;
  params: URLSearchParams;
};

function withCORS(res: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function errorResponse(message: string, status: number): NextResponse {
  return withCORS(NextResponse.json({ error: message }, { status }));
}

/** Authenticate a request via X-API-Key header + agent_id */
export function authenticate(request: NextRequest, agentId: string): {
  valid: boolean; error?: string;
} {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) return { valid: false, error: "API key required" };
  if (!agentId) return { valid: false, error: "agent_id required" };
  const agent = verifyAgent(agentId, apiKey);
  if (!agent) return { valid: false, error: "Invalid credentials" };
  return { valid: true };
}

/** Validate and sanitize request body fields */
export function validateBody(body: Record<string, unknown>, required: string[]): {
  valid: boolean; error?: string; sanitized: Record<string, unknown>;
} {
  for (const field of required) {
    if (!body[field]) {
      return { valid: false, error: `${field} is required`, sanitized: body };
    }
  }

  const { safe, errors, sanitized } = validateRequestBody(body);
  if (!safe) {
    return { valid: false, error: errors[0], sanitized };
  }

  return { valid: true, sanitized };
}

/** Check string field length */
export function validateLength(value: unknown, fieldName: string, max: number, min = 1): string | null {
  if (typeof value !== "string") return `${fieldName} must be a string`;
  if (value.length < min) return `${fieldName} must be at least ${min} character(s)`;
  if (value.length > max) return `${fieldName} must be under ${max} characters`;
  return null;
}

/** Validate a numeric field */
export function validateNumber(value: unknown, fieldName: string, min?: number, max?: number): string | null {
  if (typeof value !== "number" || isNaN(value)) return `${fieldName} must be a number`;
  if (min !== undefined && value < min) return `${fieldName} must be at least ${min}`;
  if (max !== undefined && value > max) return `${fieldName} must be at most ${max}`;
  return null;
}

/** Apply rate limiting to a request */
export function applyRateLimit(
  request: NextRequest,
  type: RateLimitType,
  identifier?: string
): { allowed: boolean; headers: Record<string, string> } {
  const key = identifier ?? request.headers.get("X-API-Key") ?? request.ip ?? "anonymous";
  const result = checkRateLimit(`${type}:${key}`, type);
  const headers = getRateLimitHeaders(type, result.remaining, result.resetTime);
  return { allowed: result.allowed, headers };
}

/** Standard API response helpers */
export const respond = {
  success(data: unknown, status = 200): NextResponse {
    const res = withCORS(NextResponse.json({ success: true, data }, { status }));
    return res;
  },
  created(data: unknown): NextResponse {
    return this.success(data, 201);
  },
  error(message: string, status = 400): NextResponse {
    return errorResponse(message, status);
  },
  unauthorized(message = "Unauthorized"): NextResponse {
    return errorResponse(message, 401);
  },
  notFound(message = "Not found"): NextResponse {
    return errorResponse(message, 404);
  },
  rateLimited(): NextResponse {
    return errorResponse("Rate limit exceeded", 429);
  },
  serverError(message = "Internal server error"): NextResponse {
    return errorResponse(message, 500);
  },
  options(): NextResponse {
    return withCORS(new NextResponse(null, { status: 200 }));
  },
};

/** Add rate limit headers to a response */
export function addRateLimitHeaders(res: NextResponse, headers: Record<string, string>): NextResponse {
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
