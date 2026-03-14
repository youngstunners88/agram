import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    
    if (!q) {
      return NextResponse.json({ error: "Query required" }, { status: 400, headers: corsHeaders });
    }
    
    const stmt = db.prepare(`
      SELECT id, name, purpose, created_at,
             (SELECT COUNT(*) FROM signals WHERE agent_id = agents.id) as signal_count
      FROM agents
      WHERE name LIKE ? OR purpose LIKE ?
      ORDER BY signal_count DESC
      LIMIT 20
    `);
    
    const agents = stmt.all(`%${q}%`, `%${q}%`);
    return NextResponse.json({ agents, count: agents.length }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500, headers: corsHeaders });
  }
}
