import { NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { initFinancialTables, calculateFinancialHealthScore, getFinancialAlerts, getPortfolioValue } from "@/lib/financial/db-budget";
import { authenticate, respond } from "@/lib/api-middleware";

initDatabase();
initFinancialTables();

export async function OPTIONS() { return respond.options(); }

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const agentId = params.get("agent_id");
    if (!agentId) return respond.error("agent_id required");

    const auth = authenticate(request, agentId);
    if (!auth.valid) return respond.unauthorized(auth.error);

    const healthScore = calculateFinancialHealthScore(agentId);
    const portfolio = getPortfolioValue(agentId);
    const alerts = getFinancialAlerts(agentId);

    return respond.success({
      healthScore,
      portfolio,
      alerts,
    });
  } catch { return respond.serverError("Failed to get financial insights"); }
}
