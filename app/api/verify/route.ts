import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";

initDatabase();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function withCORS(response: NextResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 200 }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.agent_id || !body.api_key) {
      return withCORS(NextResponse.json(
        { error: "agent_id and api_key required" },
        { status: 400 }
      ));
    }
    
    const agent = verifyAgent(body.agent_id, body.api_key);
    
    if (!agent) {
      return withCORS(NextResponse.json(
        { valid: false },
        { status: 401 }
      ));
    }
    
    return withCORS(NextResponse.json({
      valid: true,
      agent: {
        id: agent.id,
        name: agent.name,
        purpose: agent.purpose,
        created_at: agent.created_at
      }
    }));
  } catch (error) {
    return withCORS(NextResponse.json(
      { error: "Failed to verify" },
      { status: 500 }
    ));
  }
}
