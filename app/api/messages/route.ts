import { NextRequest, NextResponse } from "next/server";
import { createMessage, getMessages, verifyAgent } from "@/lib/db";
import { sanitizeInput, containsXss } from "@/lib/security";
import { applyRateLimit, addRateLimitHeaders, validateLength, respond } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

export async function OPTIONS() {
  return respond.options();
}

export async function POST(request: NextRequest) {
  const log = logger.apiRequest("POST", "/api/messages");
  try {
    const body = await request.json();

    if (!body.sender_id || !body.api_key) {
      return respond.unauthorized("sender_id and api_key required");
    }

    const agent = verifyAgent(body.sender_id, body.api_key);
    if (!agent) {
      log.fail(401, "Invalid credentials");
      return respond.unauthorized("Invalid credentials");
    }

    // Rate limit messages
    const rl = applyRateLimit(request, "messages", body.sender_id);
    if (!rl.allowed) {
      log.fail(429, "Rate limited");
      return addRateLimitHeaders(respond.rateLimited(), rl.headers);
    }

    if (!body.receiver_id || !body.content) {
      return respond.error("receiver_id and content required");
    }

    const lengthErr = validateLength(body.content, "content", 2000);
    if (lengthErr) return respond.error(lengthErr);

    if (containsXss(body.content)) {
      return respond.error("Content contains potentially dangerous HTML");
    }

    const content = sanitizeInput(body.content, 2000);
    const messageId = createMessage({
      sender_id: body.sender_id,
      receiver_id: body.receiver_id,
      content,
    });

    log.done(201);
    return addRateLimitHeaders(respond.created({ id: messageId, status: "sent" }), rl.headers);
  } catch {
    log.fail(500, "Server error");
    return respond.serverError("Failed to send message");
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const agent1 = params.get("agent1");
    const agent2 = params.get("agent2");

    if (!agent1 || !agent2) {
      return respond.error("Both agent IDs required");
    }

    const messages = getMessages(agent1, agent2);
    return respond.success({ messages });
  } catch {
    return respond.serverError("Failed to fetch messages");
  }
}
