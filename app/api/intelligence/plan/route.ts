import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { createPlan, getPlan, getAgentPlans, initPlanningTables } from "@/lib/intelligence/planning";

initPlanningTables();

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.agent_id || !body.goal) {
    return NextResponse.json({ error: "agent_id and goal required" }, { status: 400, headers: corsHeaders });
  }
  
  try {
    const planId = createPlan(body.agent_id, body.goal);
    return NextResponse.json({ plan_id: planId, success: true }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Planning failed" }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");
  const planId = searchParams.get("plan_id");
  
  try {
    if (planId) {
      const plan = getPlan(planId);
      return NextResponse.json({ plan }, { headers: corsHeaders });
    }
    if (agentId) {
      const plans = getAgentPlans(agentId);
      return NextResponse.json({ plans }, { headers: corsHeaders });
    }
    return NextResponse.json({ error: "plan_id or agent_id required" }, { status: 400, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get plans" }, { status: 500, headers: corsHeaders });
  }
}
