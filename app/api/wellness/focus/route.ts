import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initWellnessTables, logFocus, getFocusHistory, getFocusStats } from "@/lib/wellness/db-wellness";
import { authenticate, respond } from "@/lib/api-middleware";
import { sanitizeInput } from "@/lib/security";

initDatabase();
initWellnessTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!agentId) return respond.error("agent_id required");
    const view = request.nextUrl.searchParams.get("view");
    if (view === "stats") return respond.success(getFocusStats(agentId));
    return respond.success(getFocusHistory(agentId));
  } catch { return respond.serverError("Failed to get focus data"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.task || typeof body.duration_minutes !== "number") {
      return respond.error("task and duration_minutes required");
    }
    if (body.duration_minutes < 1 || body.duration_minutes > 480) {
      return respond.error("duration must be 1-480 minutes");
    }

    const id = logFocus({
      agentId: body.agent_id,
      task: sanitizeInput(body.task, 200),
      durationMinutes: body.duration_minutes,
      type: body.type, completed: body.completed,
      distractions: body.distractions,
    });
    return respond.created({ id });
  } catch { return respond.serverError("Failed to log focus session"); }
}
