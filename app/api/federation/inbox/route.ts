import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import {
  initFederationTables,
  createActivity,
  getInstanceByDomain,
  upsertRemoteAgent,
} from "@/lib/db-federation";
import { logger } from "@/lib/logger";

initFederationTables();

export async function POST(request: NextRequest) {
  const log = logger.apiRequest("POST", "/api/federation/inbox");
  try {
    const body = await request.json();
    const signature = request.headers.get("x-signature");

    if (!signature || signature.length < 32) {
      log.fail(401, "Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401, headers: corsHeaders });
    }

    const originDomain = request.headers.get("x-origin-domain");
    let instanceId: string | undefined;

    if (originDomain) {
      const instance = getInstanceByDomain(originDomain);
      instanceId = instance?.id;
    }

    // Process activity based on type
    const activityId = createActivity({
      type: body.type ?? "Unknown",
      actor: body.actor ?? "anonymous",
      object: typeof body.object === "string" ? body.object : JSON.stringify(body.object),
      target: body.target,
      instanceId,
      direction: "inbound",
    });

    // Handle Follow activities — register remote agent
    if (body.type === "Follow" && body.actor && instanceId) {
      upsertRemoteAgent({
        remoteId: body.actor,
        instanceId,
        name: body.actorName ?? body.actor,
        purpose: body.actorPurpose,
        profileUrl: body.actorProfile,
      });
    }

    log.done(200);
    return NextResponse.json(
      { received: true, activityId, type: body.type },
      { headers: corsHeaders }
    );
  } catch (error) {
    log.fail(500, "Federation inbox error");
    return NextResponse.json({ error: "Federation error" }, { status: 500, headers: corsHeaders });
  }
}
