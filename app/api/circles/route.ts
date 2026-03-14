import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.agent_id) {
      return NextResponse.json({ error: "Name and agent_id required" }, { status: 400, headers: corsHeaders });
    }
    
    const id = "circle_" + uuidv4().slice(0, 8);
    const stmt = db.prepare("INSERT INTO circles (id, name, created_by) VALUES (?, ?, ?)");
    stmt.run(id, body.name, body.agent_id);
    
    return NextResponse.json({ id, name: body.name }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create circle" }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  try {
    const circles = db.prepare("SELECT * FROM circles ORDER BY created_at DESC").all();
    return NextResponse.json({ circles }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to list circles" }, { status: 500, headers: corsHeaders });
  }
}
