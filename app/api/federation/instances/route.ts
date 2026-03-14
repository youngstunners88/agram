import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import {
  initFederationTables,
  registerInstance,
  listInstances,
  getInstance,
  updateInstanceStatus,
  getRemoteAgents,
} from "@/lib/db-federation";

initFederationTables();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const instanceId = params.get("id");
    const status = params.get("status");
    const includeAgents = params.get("include_agents") === "true";

    if (instanceId) {
      const instance = getInstance(instanceId);
      if (!instance) {
        return NextResponse.json({ error: "Instance not found" }, { status: 404, headers: corsHeaders });
      }
      const data: Record<string, unknown> = { ...instance };
      if (includeAgents) {
        data.agents = getRemoteAgents(instanceId);
      }
      return NextResponse.json({ success: true, data }, { headers: corsHeaders });
    }

    const instances = listInstances(status ?? undefined);
    return NextResponse.json({ success: true, data: instances }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list instances" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.domain) {
      return NextResponse.json(
        { error: "Domain required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Basic domain validation
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(body.domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400, headers: corsHeaders }
      );
    }

    const instanceId = registerInstance(body.domain, body.public_key);
    return NextResponse.json(
      { success: true, instanceId },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to register instance" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.status) {
      return NextResponse.json(
        { error: "Instance id and status required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const validStatuses = ["active", "pending", "suspended", "offline"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(", ")}` },
        { status: 400, headers: corsHeaders }
      );
    }

    updateInstanceStatus(body.id, body.status);
    return NextResponse.json({ success: true, message: "Instance updated" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update instance" },
      { status: 500, headers: corsHeaders }
    );
  }
}
