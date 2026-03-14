import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";
import {
  initEconomyTables, getTransactionHistory,
  createEscrow, releaseEscrow,
} from "@/lib/db-economy";

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
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50");

    if (!apiKey || !agentId) {
      return withCORS(NextResponse.json({ error: "API key and agent_id required" }, { status: 400 }));
    }
    if (!verifyAgent(agentId, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const history = getTransactionHistory(agentId, limit);
    return withCORS(NextResponse.json({ success: true, data: history }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to get transactions" }, { status: 500 }));
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

    if (body.action === "escrow") {
      if (!body.amount) {
        return withCORS(NextResponse.json({ error: "amount required" }, { status: 400 }));
      }
      const result = createEscrow(body.agent_id, body.amount, body.conditions);
      if (!result.success) {
        return withCORS(NextResponse.json({ error: result.error }, { status: 400 }));
      }
      return withCORS(NextResponse.json({ success: true, data: result }, { status: 201 }));
    }

    if (body.action === "release_escrow") {
      if (!body.escrow_id || !body.to_agent_id) {
        return withCORS(NextResponse.json({ error: "escrow_id and to_agent_id required" }, { status: 400 }));
      }
      const result = releaseEscrow(body.escrow_id, body.to_agent_id);
      if (!result.success) {
        return withCORS(NextResponse.json({ error: result.error }, { status: 400 }));
      }
      return withCORS(NextResponse.json({ success: true }));
    }

    return withCORS(NextResponse.json({ error: "Invalid action" }, { status: 400 }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Transaction failed" }, { status: 500 }));
  }
}
