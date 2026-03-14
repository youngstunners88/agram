import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { initEconomyTables, createWallet, transfer } from "@/lib/db-economy";

initEconomyTables();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.agent_id) {
      return NextResponse.json({ error: "agent_id required" }, { status: 400, headers: corsHeaders });
    }
    
    createWallet(body.agent_id);
    return NextResponse.json({ success: true, message: "Wallet created" }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create wallet" }, { status: 500, headers: corsHeaders });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.from || !body.to || !body.amount) {
      return NextResponse.json({ error: "from, to, amount required" }, { status: 400, headers: corsHeaders });
    }
    
    const success = transfer(body.from, body.to, body.amount);
    if (!success) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400, headers: corsHeaders });
    }
    
    return NextResponse.json({ success: true, message: "Transfer complete" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Transfer failed" }, { status: 500, headers: corsHeaders });
  }
}
