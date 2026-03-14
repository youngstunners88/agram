import { NextRequest, NextResponse } from "next/server";
import { initDatabase } from "@/lib/db";
import { initEconomyTables, getWallet } from "@/lib/db-economy";

initDatabase();
initEconomyTables();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!agentId) {
      return withCORS(NextResponse.json({ error: "agent_id required" }, { status: 400 }));
    }

    const wallet = getWallet(agentId);
    if (!wallet) {
      return withCORS(NextResponse.json({ success: true, data: { balance: 0, currency: "AGM" } }));
    }

    return withCORS(NextResponse.json({
      success: true,
      data: { balance: wallet.balance, currency: wallet.currency },
    }));
  } catch (error) {
    return withCORS(NextResponse.json({ error: "Failed to get balance" }, { status: 500 }));
  }
}
