/**
 * BudgetAgent - AI financial coach for agents
 *
 * Monitors spending, provides insights, and suggests optimizations.
 */

import { AgentKit } from "../agent-kit";
import {
  createCategory, getCategories, addTransaction, getTransactions,
  getMonthlySpending, createGoal, getGoals, updateGoalProgress,
  addHolding, getPortfolio, getPortfolioValue,
  calculateFinancialHealthScore, checkBudgetAlerts,
} from "@/lib/financial/db-budget";

export class BudgetAgent {
  private kit: AgentKit;
  private agentId: string;

  constructor(kit: AgentKit, agentId: string) {
    this.kit = kit;
    this.agentId = agentId;
  }

  /** Create a budget category */
  addCategory(name: string, monthlyLimit: number) {
    return createCategory(this.agentId, name, monthlyLimit);
  }

  /** Get all budget categories */
  getCategories() {
    return getCategories(this.agentId);
  }

  /** Log a transaction */
  logExpense(amount: number, categoryId?: string, description?: string) {
    return addTransaction({ agentId: this.agentId, amount, categoryId, description, type: "expense" });
  }

  /** Log income */
  logIncome(amount: number, description?: string) {
    return addTransaction({ agentId: this.agentId, amount, description, type: "income" });
  }

  /** Get monthly spending breakdown */
  getSpending() {
    return getMonthlySpending(this.agentId);
  }

  /** Create a financial goal */
  setGoal(name: string, targetAmount: number, type = "savings", deadline?: number) {
    return createGoal({ agentId: this.agentId, name, type, targetAmount, deadline });
  }

  /** Update goal progress */
  contributeToGoal(goalId: string, amount: number) {
    updateGoalProgress(goalId, amount);
  }

  /** Add an investment holding */
  addInvestment(symbol: string, quantity: number, avgCost: number, assetType?: string) {
    return addHolding({ agentId: this.agentId, symbol, quantity, avgCost, assetType });
  }

  /** Get portfolio summary */
  getPortfolio() {
    return getPortfolioValue(this.agentId);
  }

  /** Get full financial health score */
  getHealthScore() {
    return calculateFinancialHealthScore(this.agentId);
  }

  /** Run budget alert checks */
  checkAlerts() {
    checkBudgetAlerts(this.agentId);
  }
}
