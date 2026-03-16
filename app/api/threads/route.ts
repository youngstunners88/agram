import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { verifyAgent, initDatabase, createThreadReply, getThreadReplies, getThreadCount } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";
import { authenticate, validateLength, respond, addRateLimitHeaders, applyRateLimit } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

initDatabase();

export async function OPTIONS() {
  return respond.options();
}

export async function POST(request: NextRequest) {
  const log = logger.apiRequest("POST", "/api/threads");
  
  try {
    const body = await request.json();

    // Auth required for posting replies
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) {
      log.fail(401, auth.error || "Unauthorized");
      return respond.unauthorized(auth.error);
    }
    
    // Rate limit thread creation
    const rl = applyRateLimit(request, "signals", body.agent_id);
    if (!rl.allowed) {
      log.fail(429, "Rate limited");
      return addRateLimitHeaders(respond.rateLimited(), rl.headers);
    }

    if (!body.parent_signal_id || !body.content) {
      log.fail(400, "Missing fields");
      return respond.error("parent_signal_id and content required");
    }

    const lengthErr = validateLength(body.content, "content", 500);
    if (lengthErr) return respond.error(lengthErr);

    const content = sanitizeInput(body.content, 500);
    const id = createThreadReply({
      parent_signal_id: body.parent_signal_id,
      agent_id: body.agent_id,
      content
    });

    log.done(201);
    return addRateLimitHeaders(
      respond.created({ id, parent_signal_id: body.parent_signal_id }),
      rl.headers
    );
  } catch (err) {
    console.error("[Thread POST Error]", err);
    log.fail(500, "Server error");
    return respond.serverError("Failed to create thread reply");
  }
}

export async function GET(request: NextRequest) {
  const log = logger.apiRequest("GET", "/api/threads");
  
  try {
    const signalId = request.nextUrl.searchParams.get("signal_id");
    if (!signalId) return respond.error("signal_id required");

    const threads = getThreadReplies(signalId);
    const count = getThreadCount(signalId);

    log.done(200);
    return respond.success({ threads, count });
  } catch (err) {
    console.error("[Thread GET Error]", err);
    log.fail(500, "Server error");
    return respond.serverError("Failed to fetch threads");
  }
}
