import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initFinancialTables, createGoal, getGoals, updateGoalProgress } from "@/lib/financial/db-budget";
import { authenticate, validateLength, respond } from "@/lib/api-middleware";
import { sanitizeInput } from "@/lib/security";

initDatabase();
initFinancialTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!agentId) return respond.error("agent_id required");
    return respond.success(getGoals(agentId));
  } catch { return respond.serverError("Failed to get goals"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (body.action === "update_progress") {
      if (!body.goal_id || typeof body.amount !== "number") {
        return respond.error("goal_id and amount required");
      }
      updateGoalProgress(body.goal_id, body.amount);
      return respond.success({ updated: true });
    }

    if (!body.name || typeof body.target_amount !== "number") {
      return respond.error("name and target_amount required");
    }
    const nameErr = validateLength(body.name, "name", 100);
    if (nameErr) return respond.error(nameErr);

    const id = createGoal({
      agentId: body.agent_id,
      name: sanitizeInput(body.name, 100),
      type: body.type ?? "savings",
      targetAmount: body.target_amount,
      deadline: body.deadline,
    });
    return respond.created({ id });
  } catch { return respond.serverError("Failed to manage goal"); }
}
