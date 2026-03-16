import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initHealthTables, logMeal, getNutritionHistory, getDailyNutrition } from "@/lib/health/db-health";
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
    if (view === "daily") return respond.success(getDailyNutrition(agentId));
    return respond.success(getNutritionHistory(agentId));
  } catch { return respond.serverError("Failed to get nutrition data"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.meal_type || !body.description) {
      return respond.error("meal_type and description required");
    }
    const validMeals = ["breakfast", "lunch", "dinner", "snack"];
    if (!validMeals.includes(body.meal_type)) {
      return respond.error(`meal_type must be: ${validMeals.join(", ")}`);
    }

    const id = logMeal({
      agentId: body.agent_id, mealType: body.meal_type,
      description: sanitizeInput(body.description, 500),
      calories: body.calories, protein: body.protein,
      carbs: body.carbs, fat: body.fat,
    });
    return respond.created({ id });
  } catch { return respond.serverError("Failed to log meal"); }
}
