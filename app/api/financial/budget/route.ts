import { NextRequest } from "next/server";
import { initDatabase, verifyAgent } from "@/lib/db";
import { initFinancialTables, createCategory, getCategories, getMonthlySpending } from "@/lib/financial/db-budget";
import { authenticate, validateLength, respond } from "@/lib/api-middleware";
import { sanitizeInput } from "@/lib/security";

initDatabase();
initFinancialTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agent_id");
    const view = request.nextUrl.searchParams.get("view");
    if (!agentId) return respond.error("agent_id required");

    if (view === "spending") {
      return respond.success(getMonthlySpending(agentId));
    }
    return respond.success(getCategories(agentId));
  } catch { return respond.serverError("Failed to get budget"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (!body.name) return respond.error("name required");
    const nameErr = validateLength(body.name, "name", 100);
    if (nameErr) return respond.error(nameErr);
    if (typeof body.monthly_limit !== "number" || body.monthly_limit <= 0) {
      return respond.error("monthly_limit must be a positive number");
    }

    const name = sanitizeInput(body.name, 100);
    const id = createCategory(body.agent_id, name, body.monthly_limit, body.color);
    return respond.created({ id });
  } catch { return respond.serverError("Failed to create category"); }
}
