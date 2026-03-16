import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initWellnessTables, createHabit, completeHabit, getHabits } from "@/lib/wellness/db-wellness";
import { authenticate, validateLength, respond } from "@/lib/api-middleware";
import { sanitizeInput } from "@/lib/security";

initDatabase();
initWellnessTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!agentId) return respond.error("agent_id required");
    return respond.success(getHabits(agentId));
  } catch { return respond.serverError("Failed to get habits"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (body.action === "complete") {
      if (!body.habit_id) return respond.error("habit_id required");
      completeHabit(body.habit_id, body.notes);
      return respond.success({ completed: true });
    }

    if (!body.name) return respond.error("name required");
    const nameErr = validateLength(body.name, "name", 100);
    if (nameErr) return respond.error(nameErr);

    const validFrequencies = ["daily", "weekly", "monthly"];
    if (body.frequency && !validFrequencies.includes(body.frequency)) {
      return respond.error(`frequency must be: ${validFrequencies.join(", ")}`);
    }

    const id = createHabit(body.agent_id, sanitizeInput(body.name, 100), body.description, body.frequency);
    return respond.created({ id });
  } catch { return respond.serverError("Failed to manage habit"); }
}
