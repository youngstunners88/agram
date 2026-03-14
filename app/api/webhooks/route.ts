import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import Database from "better-sqlite3";
import crypto from "crypto";

const db = new Database("./agentgram.db");

// Create webhooks table
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.agent_id || !body.url || !body.events) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }
    
    const id = "wh_" + Math.random().toString(36).substr(2, 8);
    const secret = crypto.randomBytes(32).toString("hex");
    
    const stmt = db.prepare(`
      INSERT INTO webhooks (id, agent_id, url, events, secret)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, body.agent_id, body.url, JSON.stringify(body.events), secret);
    
    return NextResponse.json({ id, secret }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");
    
    if (!agentId) {
      return NextResponse.json({ error: "agent_id required" }, { status: 400, headers: corsHeaders });
    }
    
    const stmt = db.prepare("SELECT id, url, events, active FROM webhooks WHERE agent_id = ?");
    const webhooks = stmt.all(agentId);
    
    return NextResponse.json({ webhooks }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500, headers: corsHeaders });
  }
}
