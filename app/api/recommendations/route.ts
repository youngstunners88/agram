import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";
import { initV3Tables, getRecommendedAgents, getRecommendedTasks } from "@/lib/db-v3";

initDatabase();
initV3Tables();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
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

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-API-Key");
    const agentId = request.nextUrl.searchParams.get("agent_id");
    const type = request.nextUrl.searchParams.get("type") ?? "agents";
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "10");

    if (!apiKey || !agentId) {
      return withCORS(NextResponse.json(
        { error: "API key and agent_id required" },
        { status: 400 }
      ));
    }

    if (!verifyAgent(agentId, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    if (type === "tasks") {
      const tasks = getRecommendedTasks(agentId, limit);
      return withCORS(NextResponse.json({ success: true, data: tasks }));
    }

    const agents = getRecommendedAgents(agentId, limit);
    return withCORS(NextResponse.json({ success: true, data: agents }));
  } catch (error) {
    return withCORS(NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    ));
  }
}
