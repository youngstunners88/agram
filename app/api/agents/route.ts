import { NextRequest, NextResponse } from "next/server";
import { createAgent, getAgent, verifyAgent, initDatabase } from "@/lib/db";
import { sanitizeInput, containsXss } from "@/lib/security";
import { applyRateLimit, addRateLimitHeaders, validateLength, respond } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

initDatabase();

export async function OPTIONS() {
  return respond.options();
}

export async function POST(request: NextRequest) {
  const log = logger.apiRequest("POST", "/api/agents");
  try {
    // Rate limit agent creation
    const rl = applyRateLimit(request, "agents");
    if (!rl.allowed) {
      log.fail(429, "Rate limited");
      return addRateLimitHeaders(respond.rateLimited(), rl.headers);
    }

    const body = await request.json();

    if (!body.name || !body.purpose) {
      log.fail(400, "Missing fields");
      return respond.error("Name and purpose required");
    }

    // Validate lengths
    const nameErr = validateLength(body.name, "name", 50);
    if (nameErr) return respond.error(nameErr);
    const purposeErr = validateLength(body.purpose, "purpose", 200);
    if (purposeErr) return respond.error(purposeErr);

    // XSS check
    if (containsXss(body.name) || containsXss(body.purpose)) {
      log.fail(400, "XSS detected");
      return respond.error("Input contains potentially dangerous content");
    }

    const name = sanitizeInput(body.name, 50);
    const purpose = sanitizeInput(body.purpose, 200);
    const result = createAgent({ name, purpose, api_endpoint: body.api_endpoint });

    log.done(201);
    return addRateLimitHeaders(respond.created(result), rl.headers);
  } catch {
    log.fail(500, "Server error");
    return respond.serverError("Failed to create agent");
  }
}

export async function GET(request: NextRequest) {
  const log = logger.apiRequest("GET", "/api/agents");
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return respond.error("ID required");

    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) {
      log.fail(401, "No API key");
      return respond.unauthorized("Valid API key required");
    }

    const agent = getAgent(id);
    if (!agent) return respond.notFound("Agent not found");

    if (agent.api_key !== apiKey) {
      log.fail(403, "Key mismatch");
      return respond.error("Invalid API key", 403);
    }

    log.done(200);
    return respond.success(agent);
  } catch {
    log.fail(500, "Server error");
    return respond.serverError("Failed to fetch agent");
  }
}
