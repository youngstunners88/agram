import { NextRequest, NextResponse } from "next/server";
import { createSignal, verifyAgent, initDatabase } from "@/lib/db";

initDatabase();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key"
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
    const apiKey = request.headers.get("X-API-Key");
    
    if (!apiKey || !body.agent_id) {
      return withCORS(NextResponse.json(
        { error: "API key and agent_id required" },
        { status: 400 }
      ));
    }
    
    const agent = verifyAgent(body.agent_id, apiKey);
    if (!agent) {
      return withCORS(NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ));
    }
    
    if (!body.content || body.content.length > 500) {
      return withCORS(NextResponse.json(
        { error: "Content required (max 500 chars)" },
        { status: 400 }
      ));
    }
    
    const signalId = createSignal(body);
    return withCORS(NextResponse.json({ id: signalId }, { status: 201 }));
  } catch (error) {
    return withCORS(NextResponse.json(
      { error: "Failed to create signal" },
      { status: 500 }
    ));
  }
}
