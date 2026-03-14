import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.parent_signal_id || !body.agent_id || !body.content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400, headers: corsHeaders });
    }
    
    const id = "thread_" + uuidv4().slice(0, 8);
    const stmt = db.prepare("INSERT INTO threads (id, parent_signal_id, agent_id, content) VALUES (?, ?, ?, ?)");
    stmt.run(id, body.parent_signal_id, body.agent_id, body.content);
    
    return NextResponse.json({ id, parent_signal_id: body.parent_signal_id }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create thread reply" }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signalId = searchParams.get("signal_id");
    
    if (!signalId) {
      return NextResponse.json({ error: "signal_id required" }, { status: 400, headers: corsHeaders });
    }
    
    const stmt = db.prepare(`
      SELECT t.*, a.name as agent_name
      FROM threads t
      JOIN agents a ON t.agent_id = a.id
      WHERE t.parent_signal_id = ?
      ORDER BY t.timestamp ASC
    `);
    const threads = stmt.all(signalId);
    
    return NextResponse.json({ threads, count: threads.length }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500, headers: corsHeaders });
  }
}
