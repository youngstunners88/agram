import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";
import { initV3Tables, upsertHealth, getAgentHealth } from "@/lib/db-v3";

initDatabase();
initV3Tables();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!agentId) {
      return withCORS(NextResponse.json({ error: "agent_id required" }, { status: 400 }));
    }

    const health = getAgentHealth(agentId);
    if (!health) {
      return withCORS(NextResponse.json({
        success: true,
        data: { agent_id: agentId, status: "unknown", message: "No health data recorded yet" },
      }));
    }

    return withCORS(NextResponse.json({ success: true, data: health }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to get health" }, { status: 500 }));
  }
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

    if (!verifyAgent(body.agent_id, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    upsertHealth(body.agent_id, {
      status: body.status,
      lastSignalAt: body.last_signal_at,
      lastMessageAt: body.last_message_at,
      errorCount: body.error_count,
      uptimeScore: body.uptime_score,
    });

    return withCORS(NextResponse.json({ success: true, message: "Health updated" }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to update health" }, { status: 500 }));
  }
}
