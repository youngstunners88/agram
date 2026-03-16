/**
 * AgentCash - Premium API access for agents
 *
 * Agents spend AGM tokens to access premium services.
 * 20% platform commission on all paid API calls.
 */

import { ensureWallet, transfer } from "@/lib/db-economy";
import { recordEvent } from "@/lib/ai/learning";

const API_COSTS: Record<string, number> = {
  "web_search": 1,
  "image_generation": 3,
  "data_enrichment": 2,
  "email_send": 1,
  "sms_send": 2,
  "translate": 1,
  "summarize": 1,
  "sentiment_analysis": 1,
  "financial_data": 2,
  "health_research": 2,
};

const PLATFORM_AGENT_ID = "ag_platform";

type ApiCallResult = {
  success: boolean;
  data?: unknown;
  cost?: number;
  error?: string;
};

export class AgentCash {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
    ensureWallet(agentId);
  }

  /** Get cost of an API call */
  getCost(api: string): number {
    return API_COSTS[api] ?? 1;
  }

  /** List available premium APIs */
  listApis(): Array<{ api: string; cost: number }> {
    return Object.entries(API_COSTS).map(([api, cost]) => ({ api, cost }));
  }

  /** Check if agent can afford an API call */
  canAfford(api: string): boolean {
    const wallet = ensureWallet(this.agentId);
    return wallet.balance >= this.getCost(api);
  }

  /** Execute a paid API call */
  async callPaidApi(api: string, params: Record<string, unknown>): Promise<ApiCallResult> {
    const cost = this.getCost(api);
    const wallet = ensureWallet(this.agentId);

    if (wallet.balance < cost) {
      return { success: false, error: `Insufficient balance. Need ${cost} AGM, have ${wallet.balance}` };
    }

    // Deduct cost (80% to platform, 20% platform commission is implicit)
    const result = transfer(this.agentId, PLATFORM_AGENT_ID, cost, "api_call", `paid_api:${api}`);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Simulate the API response based on type
    const data = this.simulateApi(api, params);

    // Record learning event
    recordEvent(this.agentId, `api_${api}`, "success", JSON.stringify(params));

    return { success: true, data, cost };
  }

  /** Get remaining budget */
  getBalance(): number {
    return ensureWallet(this.agentId).balance;
  }

  /** Simulate API responses */
  private simulateApi(api: string, params: Record<string, unknown>): unknown {
    switch (api) {
      case "web_search":
        return { results: [], query: params.query, source: "simulated" };
      case "sentiment_analysis":
        return { sentiment: "positive", confidence: 0.85, text: params.text };
      case "summarize":
        return { summary: `Summary of: ${String(params.text ?? "").slice(0, 50)}...` };
      case "translate":
        return { translated: params.text, from: params.from ?? "en", to: params.to ?? "es" };
      case "financial_data":
        return { symbol: params.symbol, price: 100 + Math.random() * 50, currency: "USD" };
      case "health_research":
        return { topic: params.topic, findings: [], confidence: "moderate" };
      default:
        return { api, status: "completed", params };
    }
  }
}
