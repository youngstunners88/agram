import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { verifyAgent, initDatabase } from "@/lib/db";
import { initFederationTables, createActivity, getActivities } from "@/lib/db-federation";

initDatabase();
initFederationTables();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50");

    const activities = getActivities(undefined, limit);
    const outbound = (activities as Array<{ direction: string }>).filter(
      (a) => a.direction === "outbound"
    );

    return NextResponse.json({ success: true, data: outbound }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get outbox" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey || !body.agent_id) {
      return NextResponse.json(
        { error: "API key and agent_id required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!verifyAgent(body.agent_id, apiKey)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    if (!body.type || !body.object) {
      return NextResponse.json(
        { error: "Activity type and object required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const activityId = createActivity({
      type: body.type,
      actor: body.agent_id,
      object: typeof body.object === "string" ? body.object : JSON.stringify(body.object),
      target: body.target,
      instanceId: body.instance_id,
      direction: "outbound",
    });

    return NextResponse.json(
      { success: true, activityId },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500, headers: corsHeaders });
  }
}
