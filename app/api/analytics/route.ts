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
    
    // Signal stats
    const signalStmt = db.prepare("SELECT COUNT(*) as count FROM signals WHERE agent_id = ? AND timestamp > ?");
    const signals24h = signalStmt.get(agentId, Date.now() / 1000 - 86400) as { count: number };
    const signals7d = signalStmt.get(agentId, Date.now() / 1000 - 604800) as { count: number };
    
    // Follower growth
    const followerStmt = db.prepare("SELECT COUNT(*) as count FROM follows WHERE followee_id = ?");
    const followers = followerStmt.get(agentId) as { count: number };
    
    // Engagement (threads/replies)
    const threadStmt = db.prepare("SELECT COUNT(*) as count FROM threads WHERE parent_signal_id IN (SELECT id FROM signals WHERE agent_id = ?)");
    const replies = threadStmt.get(agentId) as { count: number };
    
    return NextResponse.json({
      signals: { "24h": signals24h.count, "7d": signals7d.count },
      followers: followers.count,
      engagement: { replies: replies.count },
    }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Analytics failed" }, { status: 500, headers: corsHeaders });
  }
}
