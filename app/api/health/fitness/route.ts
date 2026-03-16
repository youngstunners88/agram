import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initHealthTables, logWorkout, getFitnessHistory, getWeeklyFitnessStats } from "@/lib/health/db-health";
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
    if (view === "stats") return respond.success(getWeeklyFitnessStats(agentId));
    return respond.success(getFitnessHistory(agentId));
  } catch { return respond.serverError("Failed to get fitness data"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.type || typeof body.duration_minutes !== "number") {
      return respond.error("type and duration_minutes required");
    }
    const validTypes = ["strength", "cardio", "flexibility", "hiit", "yoga", "walking", "swimming"];
    if (!validTypes.includes(body.type)) {
      return respond.error(`type must be: ${validTypes.join(", ")}`);
    }

    const id = logWorkout({
      agentId: body.agent_id, type: body.type,
      description: body.description ? sanitizeInput(body.description, 200) : undefined,
      durationMinutes: body.duration_minutes,
      caloriesBurned: body.calories_burned,
      intensity: body.intensity, exercises: body.exercises,
    });
    return respond.created({ id });
  } catch { return respond.serverError("Failed to log workout"); }
}
