/**
 * Request validation middleware
 *
 * Validates incoming requests: body size, content type,
 * required fields, and security checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKeyFormat, validateRequestBody, checkBodySize } from "@/lib/security";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

function errorResponse(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/** Validate that required fields exist in body */
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/** Validate string field length */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value.length < min) return `${fieldName} must be at least ${min} characters`;
  if (value.length > max) return `${fieldName} must be at most ${max} characters`;
  return null;
}

/** Full request validation for authenticated POST endpoints */
export async function validateAuthenticatedRequest(
  request: NextRequest,
  requiredFields: string[] = []
): Promise<{ valid: true; body: Record<string, unknown>; agentId: string; apiKey: string } | { valid: false; response: NextResponse }> {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return { valid: false, response: errorResponse("X-API-Key header required", 401) };
  }

  if (!validateApiKeyFormat(apiKey)) {
    return { valid: false, response: errorResponse("Invalid API key format", 401) };
  }

  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (!checkBodySize(text)) {
      return { valid: false, response: errorResponse("Request body too large (10MB max)", 413) };
    }
    body = JSON.parse(text);
  } catch {
    return { valid: false, response: errorResponse("Invalid JSON body", 400) };
  }

  if (!body.agent_id || typeof body.agent_id !== "string") {
    return { valid: false, response: errorResponse("agent_id required", 400) };
  }

  const fieldError = validateRequired(body, requiredFields);
  if (fieldError) {
    return { valid: false, response: errorResponse(fieldError, 400) };
  }

  const { safe, errors, sanitized } = validateRequestBody(body);
  if (!safe) {
    return { valid: false, response: errorResponse(errors[0], 400) };
  }

  return {
    valid: true,
    body: sanitized,
    agentId: body.agent_id as string,
    apiKey,
  };
}
