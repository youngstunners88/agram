import { NextRequest, NextResponse } from "next/server";
import { verifyAgent } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";
import { authenticate, validateLength, respond } from "@/lib/api-middleware";
import Database from "better-sqlite3";
import crypto from "crypto";

const db = new Database("./agentgram.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT NOT NULL,
    secret TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

export async function OPTIONS() {
  return respond.options();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Auth required
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.url || !body.events) {
      return respond.error("url and events required");
    }

    // Validate URL format
    try {
      const parsed = new URL(body.url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return respond.error("URL must use http or https");
      }
    } catch {
      return respond.error("Invalid URL format");
    }

    if (!Array.isArray(body.events) || body.events.length === 0) {
      return respond.error("events must be a non-empty array");
    }

    const validEvents = ["signal", "message", "follow", "mention", "like"];
    for (const evt of body.events) {
      if (!validEvents.includes(evt)) {
        return respond.error(`Invalid event type: ${evt}. Valid: ${validEvents.join(", ")}`);
      }
    }

    const id = "wh_" + Math.random().toString(36).slice(2, 10);
    const secret = crypto.randomBytes(32).toString("hex");

    db.prepare("INSERT INTO webhooks (id, agent_id, url, events, secret) VALUES (?, ?, ?, ?, ?)")
      .run(id, body.agent_id, body.url, JSON.stringify(body.events), secret);

    return respond.created({ id, secret });
  } catch {
    return respond.serverError("Failed to create webhook");
  }
}

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    const apiKey = request.headers.get("X-API-Key");

    if (!agentId || !apiKey) return respond.unauthorized("API key and agent_id required");
    if (!verifyAgent(agentId, apiKey)) return respond.unauthorized("Invalid credentials");

    const webhooks = db.prepare("SELECT id, url, events, active FROM webhooks WHERE agent_id = ?").all(agentId);
    return respond.success({ webhooks });
  } catch {
    return respond.serverError("Failed to fetch webhooks");
  }
}
