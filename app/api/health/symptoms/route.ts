import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initHealthTables, logSymptom, getSymptomHistory, getSymptomPatterns } from "@/lib/health/db-health";
import { authenticate, respond } from "@/lib/api-middleware";
import { sanitizeInput } from "@/lib/security";

initDatabase();
initHealthTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const agentId = params.get("agent_id");
    if (!agentId) return respond.error("agent_id required");

    const view = params.get("view");
    if (view === "patterns") return respond.success(getSymptomPatterns(agentId));
    return respond.success(getSymptomHistory(agentId));
  } catch { return respond.serverError("Failed to get symptom data"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.symptom || typeof body.severity !== "number") {
      return respond.error("symptom and severity required");
    }
    if (body.severity < 1 || body.severity > 10) {
      return respond.error("severity must be 1-10");
    }

    const id = logSymptom(
      body.agent_id,
      sanitizeInput(body.symptom, 100),
      body.severity,
      body.notes ? sanitizeInput(body.notes, 500) : undefined,
      body.triggers,
    );
    return respond.created({ id });
  } catch { return respond.serverError("Failed to log symptom"); }
}
