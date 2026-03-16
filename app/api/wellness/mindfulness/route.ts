import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initWellnessTables, logMindfulness, getMindfulnessHistory, getMindfulnessStreak } from "@/lib/wellness/db-wellness";
import { authenticate, respond } from "@/lib/api-middleware";

initDatabase();
initWellnessTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!agentId) return respond.error("agent_id required");
    const history = getMindfulnessHistory(agentId);
    const streak = getMindfulnessStreak(agentId);
    return respond.success({ sessions: history, streak });
  } catch { return respond.serverError("Failed to get mindfulness data"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.type || typeof body.duration_seconds !== "number") {
      return respond.error("type and duration_seconds required");
    }
    const validTypes = ["meditation", "breathing", "body_scan", "walking", "gratitude"];
    if (!validTypes.includes(body.type)) {
      return respond.error(`type must be one of: ${validTypes.join(", ")}`);
    }

    const id = logMindfulness({
      agentId: body.agent_id, type: body.type,
      durationSeconds: body.duration_seconds,
      moodBefore: body.mood_before, moodAfter: body.mood_after,
      notes: body.notes,
    });
    return respond.created({ id });
  } catch { return respond.serverError("Failed to log mindfulness session"); }
}
