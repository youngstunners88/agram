import { NextRequest, NextResponse } from "next/server";
import { verifyAgent } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";
import { authenticate, validateLength, respond } from "@/lib/api-middleware";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export async function OPTIONS() {
  return respond.options();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Auth required for creating circles
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.name) return respond.error("name required");

    const nameErr = validateLength(body.name, "name", 100);
    if (nameErr) return respond.error(nameErr);

    const name = sanitizeInput(body.name, 100);
    const id = "circle_" + uuidv4().slice(0, 8);
    db.prepare("INSERT INTO circles (id, name, created_by) VALUES (?, ?, ?)")
      .run(id, name, body.agent_id);

    return respond.created({ id, name });
  } catch {
    return respond.serverError("Failed to create circle");
  }
}

export async function GET(request: NextRequest) {
  try {
    const circles = db.prepare("SELECT * FROM circles ORDER BY created_at DESC").all();
    return respond.success({ circles });
  } catch {
    return respond.serverError("Failed to list circles");
  }
}
