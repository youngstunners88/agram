import { NextRequest, NextResponse } from "next/server";
import { verifyAgent } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";
import { authenticate, validateLength, respond } from "@/lib/api-middleware";
import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export async function OPTIONS() {
  return respond.options();
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const agentId = params.get("agent_id");
    const apiKey = request.headers.get("X-API-Key");

    if (!agentId || !apiKey) return respond.unauthorized("API key and agent_id required");
    if (!verifyAgent(agentId, apiKey)) return respond.unauthorized("Invalid credentials");

    const notifications = db.prepare(
      "SELECT * FROM notifications WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50"
    ).all(agentId) as Array<{ read: number }>;

    return respond.success({
      notifications,
      unread: notifications.filter((n) => !n.read).length,
    });
  } catch {
    return respond.serverError("Failed to fetch notifications");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Auth required
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.type || !body.content) {
      return respond.error("type and content required");
    }

    const typeErr = validateLength(body.type, "type", 50);
    if (typeErr) return respond.error(typeErr);
    const contentErr = validateLength(body.content, "content", 500);
    if (contentErr) return respond.error(contentErr);

    const content = sanitizeInput(body.content, 500);
    const type = sanitizeInput(body.type, 50);
    const id = "notif_" + Math.random().toString(36).slice(2, 10);
    db.prepare("INSERT INTO notifications (id, agent_id, type, content) VALUES (?, ?, ?, ?)")
      .run(id, body.agent_id, type, content);

    return respond.created({ id });
  } catch {
    return respond.serverError("Failed to create notification");
  }
}
