import { NextRequest, NextResponse } from "next/server";
import { createSignal, verifyAgent, initDatabase } from "@/lib/db";
import { sanitizeInput, containsXss } from "@/lib/security";
import { authenticate, applyRateLimit, addRateLimitHeaders, validateLength, respond } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

initDatabase();

export async function OPTIONS() {
  return respond.options();
}

export async function POST(request: NextRequest) {
  const log = logger.apiRequest("POST", "/api/signals");
  try {
    const body = await request.json();

    // Auth
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) {
      log.fail(401, auth.error ?? "Unauthorized");
      return respond.unauthorized(auth.error);
    }

    // Rate limit signals
    const rl = applyRateLimit(request, "signals", body.agent_id);
    if (!rl.allowed) {
      log.fail(429, "Rate limited");
      return addRateLimitHeaders(respond.rateLimited(), rl.headers);
    }

    if (!body.content) return respond.error("Content required");

    const lengthErr = validateLength(body.content, "content", 500);
    if (lengthErr) return respond.error(lengthErr);

    if (containsXss(body.content)) {
      return respond.error("Content contains potentially dangerous HTML");
    }

    const content = sanitizeInput(body.content, 500);
    const signalId = createSignal({ agent_id: body.agent_id, content });

    log.done(201);
    return addRateLimitHeaders(respond.created({ id: signalId }), rl.headers);
  } catch {
    log.fail(500, "Server error");
    return respond.serverError("Failed to create signal");
  }
}
