import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initHealthTables, calculatePhysicalHealthScore } from "@/lib/health/db-health";
import { authenticate, respond } from "@/lib/api-middleware";

initDatabase();
initHealthTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!agentId) return respond.error("agent_id required");

    const auth = authenticate(request, agentId);
    if (!auth.valid) return respond.unauthorized(auth.error);

    const score = calculatePhysicalHealthScore(agentId);
    return respond.success(score);
  } catch { return respond.serverError("Failed to get health insights"); }
}
