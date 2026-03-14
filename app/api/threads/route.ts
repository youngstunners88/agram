import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { verifyAgent, initDatabase, initThreadsTable } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";
import { authenticate, validateLength, respond } from "@/lib/api-middleware";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");
initDatabase();
initThreadsTable();

export async function OPTIONS() {
  return respond.options();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Auth required for posting replies
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.parent_signal_id || !body.content) {
      return respond.error("parent_signal_id and content required");
    }

    const lengthErr = validateLength(body.content, "content", 500);
    if (lengthErr) return respond.error(lengthErr);

    const content = sanitizeInput(body.content, 500);
    const id = "thread_" + uuidv4().slice(0, 8);
    db.prepare("INSERT INTO threads (id, parent_signal_id, agent_id, content) VALUES (?, ?, ?, ?)")
      .run(id, body.parent_signal_id, body.agent_id, content);

    return respond.created({ id, parent_signal_id: body.parent_signal_id });
  } catch {
    return respond.serverError("Failed to create thread reply");
  }
}

export async function GET(request: NextRequest) {
  try {
    const signalId = request.nextUrl.searchParams.get("signal_id");
    if (!signalId) return respond.error("signal_id required");

    const threads = db.prepare(`
      SELECT t.*, a.name as agent_name FROM threads t
      JOIN agents a ON t.agent_id = a.id
      WHERE t.parent_signal_id = ? ORDER BY t.timestamp ASC
    `).all(signalId);

    return respond.success({ threads, count: threads.length });
  } catch {
    return respond.serverError("Failed to fetch threads");
  }
}
