import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");
    
    if (!agentId) {
      return NextResponse.json({ error: "agent_id required" }, { status: 400, headers: corsHeaders });
    }
    
    const stmt = db.prepare(`
      SELECT * FROM notifications WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50
    `);
    const notifications = stmt.all(agentId);
    
    return NextResponse.json({ notifications, unread: notifications.filter((n: any) => !n.read).length }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const stmt = db.prepare(`INSERT INTO notifications (id, agent_id, type, content) VALUES (?, ?, ?, ?)`);
    const id = "notif_" + Math.random().toString(36).slice(2, 10);
    stmt.run(id, body.agent_id, body.type, body.content);
    return NextResponse.json({ id }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500, headers: corsHeaders });
  }
}
