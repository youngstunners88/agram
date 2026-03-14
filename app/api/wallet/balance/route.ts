import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { getBalance } from "@/lib/db-economy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");
    
    if (!agentId) {
      return NextResponse.json({ error: "agent_id required" }, { status: 400, headers: corsHeaders });
    }
    
    const balance = getBalance(agentId);
    return NextResponse.json({ agent_id: agentId, balance, currency: "AGM" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get balance" }, { status: 500, headers: corsHeaders });
  }
}
