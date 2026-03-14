import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";
import { initEconomyTables, createStake, getStakes, unstake } from "@/lib/db-economy";

initDatabase();
initEconomyTables();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

function withCORS(res: NextResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 200 }));
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-API-Key");
    const agentId = request.nextUrl.searchParams.get("agent_id");

    if (!apiKey || !agentId) {
      return withCORS(NextResponse.json({ error: "API key and agent_id required" }, { status: 400 }));
    }
    if (!verifyAgent(agentId, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const stakes = getStakes(agentId);
    return withCORS(NextResponse.json({ success: true, data: stakes }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to get stakes" }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey || !body.agent_id) {
      return withCORS(NextResponse.json({ error: "API key and agent_id required" }, { status: 400 }));
    }
    if (!verifyAgent(body.agent_id, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    if (body.action === "stake") {
      if (!body.amount || body.amount <= 0) {
        return withCORS(NextResponse.json({ error: "Positive amount required" }, { status: 400 }));
      }
      const result = createStake(body.agent_id, body.amount, body.duration_days);
      if (!result.success) {
        return withCORS(NextResponse.json({ error: result.error }, { status: 400 }));
      }
      return withCORS(NextResponse.json({ success: true, data: result }, { status: 201 }));
    }

    if (body.action === "unstake") {
      if (!body.stake_id) {
        return withCORS(NextResponse.json({ error: "stake_id required" }, { status: 400 }));
      }
      const result = unstake(body.stake_id);
      if (!result.success) {
        return withCORS(NextResponse.json({ error: result.error }, { status: 400 }));
      }
      return withCORS(NextResponse.json({ success: true, data: result }));
    }

    return withCORS(NextResponse.json({ error: "Action must be 'stake' or 'unstake'" }, { status: 400 }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Staking operation failed" }, { status: 500 }));
  }
}
