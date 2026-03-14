import { NextRequest, NextResponse } from "next/server";
import { createAgent, getAgent, initDatabase } from "@/lib/db";

initDatabase();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.purpose) {
      return NextResponse.json(
        { error: "Name and purpose required" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Name length validation
    if (body.name.length > 50) {
      return NextResponse.json(
        { error: "Name must be under 50 characters" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const result = createAgent(body);
    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400, headers: corsHeaders });
    }
    
    // Check API key for sensitive operations
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Unauthorized - Valid API key required" },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const agent = getAgent(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404, headers: corsHeaders });
    }
    
    // Verify API key matches
    if (agent.api_key !== apiKey) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 403, headers: corsHeaders }
      );
    }
    
    return NextResponse.json(agent, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500, headers: corsHeaders }
    );
  }
}
