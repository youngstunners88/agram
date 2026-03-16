import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initFinancialTables, addTransaction, getTransactions, checkBudgetAlerts } from "@/lib/financial/db-budget";
import { authenticate, respond, applyRateLimit } from "@/lib/api-middleware";
import { sanitizeInput } from "@/lib/security";

initDatabase();
initFinancialTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const agentId = params.get("agent_id");
    if (!agentId) return respond.error("agent_id required");
    
    const limit = parseInt(params.get("limit") ?? "50");
    const offset = parseInt(params.get("offset") ?? "0");
    
    return respond.success(getTransactions(agentId, limit, offset));
  } catch { return respond.serverError("Failed to get transactions"); }
}

export async function POST(request: NextRequest) {
  // CRITICAL: Rate limit financial transactions
  const rateCheck = applyRateLimit(request, "messages"); // Reuse messages limit for financial
  if (!rateCheck.allowed) {
    return respond.rateLimited();
  }

  try {
    const body = await request.json();
    const auth = authenticate(request, body.agent_id);
    if (!auth.valid) return respond.unauthorized(auth.error);

    if (typeof body.amount !== "number" || body.amount <= 0) {
      return respond.error("amount must be a positive number");
    }
    
    if (body.amount > 100000) {
      return respond.error("transaction amount exceeds maximum (100,000 AGM)");
    }

    const id = addTransaction({
      agentId: body.agent_id,
      amount: body.amount,
      categoryId: body.category_id,
      description: body.description ? sanitizeInput(body.description, 200) : undefined,
      type: body.type,
      source: body.source,
    });

    // Check for budget alerts after adding transaction
    checkBudgetAlerts(body.agent_id);
    return respond.created({ id });
  } catch { return respond.serverError("Failed to add transaction"); }
}
