import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { executePlan, getExecutionStatus } from "@/lib/intelligence/execution";

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.plan_id) {
    return NextResponse.json({ error: "plan_id required" }, { status: 400, headers: corsHeaders });
  }
  
  try {
    const results = await executePlan(body.plan_id);
    return NextResponse.json({ results, success: true }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Execution failed" }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("plan_id");
  
  if (!planId) {
    return NextResponse.json({ error: "plan_id required" }, { status: 400, headers: corsHeaders });
  }
  
  try {
    const status = getExecutionStatus(planId);
    return NextResponse.json({ status }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500, headers: corsHeaders });
  }
}
