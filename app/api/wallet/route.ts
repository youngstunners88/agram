import { NextRequest, NextResponse } from "next/server";
import { verifyAgent, initDatabase } from "@/lib/db";
import {
  initEconomyTables, ensureWallet, transfer,
  getTransactionHistory,
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

    if (!apiKey || !agentId) {
      return withCORS(NextResponse.json({ error: "API key and agent_id required" }, { status: 400 }));
    }
    if (!verifyAgent(agentId, apiKey)) {
      return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const wallet = ensureWallet(agentId);
    const history = getTransactionHistory(agentId, 20);
    return withCORS(NextResponse.json({ success: true, data: { wallet, recentTransactions: history } }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to get wallet" }, { status: 500 }));
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

    if (body.action === "transfer") {
      if (!body.to_agent_id || !body.amount) {
        return withCORS(NextResponse.json({ error: "to_agent_id and amount required" }, { status: 400 }));
      }
      const result = transfer(body.agent_id, body.to_agent_id, body.amount, "payment", body.memo);
      if (!result.success) {
        return withCORS(NextResponse.json({ error: result.error }, { status: 400 }));
      }
      return withCORS(NextResponse.json({ success: true, transactionId: result.transactionId }, { status: 201 }));
    }

    // Default: ensure wallet exists
    const wallet = ensureWallet(body.agent_id);
    return withCORS(NextResponse.json({ success: true, data: wallet }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Wallet operation failed" }, { status: 500 }));
  }
}
