/**
 * Financial Database - Budget categories, transactions, goals, investments
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initFinancialTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      monthly_limit REAL NOT NULL,
      spent REAL DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS financial_transactions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'expense',
      source TEXT DEFAULT 'manual',
      date INTEGER DEFAULT (unixepoch()),
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (category_id) REFERENCES budget_categories(id)
    );

    CREATE TABLE IF NOT EXISTS financial_goals (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline INTEGER,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS investment_holdings (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      name TEXT,
      quantity REAL NOT NULL,
      avg_cost REAL NOT NULL,
      current_price REAL,
      asset_type TEXT DEFAULT 'stock',
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS financial_alerts (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fin_tx_agent ON financial_transactions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_fin_tx_date ON financial_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_fin_tx_category ON financial_transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_fin_goals_agent ON financial_goals(agent_id);
    CREATE INDEX IF NOT EXISTS idx_fin_holdings_agent ON investment_holdings(agent_id);
    CREATE INDEX IF NOT EXISTS idx_budget_cat_agent ON budget_categories(agent_id);
  `);
}

// --- Budget Categories ---

export function createCategory(agentId: string, name: string, monthlyLimit: number, color?: string) {
  const id = "bcat_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO budget_categories (id, agent_id, name, monthly_limit, color) VALUES (?, ?, ?, ?, ?)")
    .run(id, agentId, name, monthlyLimit, color ?? "#6366f1");
  return id;
}

export function getCategories(agentId: string) {
  return db.prepare("SELECT * FROM budget_categories WHERE agent_id = ? ORDER BY name").all(agentId);
}

export function updateCategorySpent(categoryId: string) {
  const now = Math.floor(Date.now() / 1000);
  const monthStart = now - (new Date().getDate() - 1) * 86400;
  const sum = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE category_id = ? AND date >= ? AND type = 'expense'"
  ).get(categoryId, monthStart) as { total: number };
  db.prepare("UPDATE budget_categories SET spent = ? WHERE id = ?").run(sum.total, categoryId);
  return sum.total;
}

// --- Transactions ---

export function addTransaction(tx: {
  agentId: string; amount: number; categoryId?: string;
  description?: string; type?: string; source?: string; date?: number;
}) {
  const id = "ftx_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO financial_transactions (id, agent_id, amount, category_id, description, type, source, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tx.agentId, tx.amount, tx.categoryId ?? null, tx.description ?? null,
    tx.type ?? "expense", tx.source ?? "manual", tx.date ?? Math.floor(Date.now() / 1000));

  if (tx.categoryId) updateCategorySpent(tx.categoryId);
  return id;
}

export function getTransactions(agentId: string, limit = 50, offset = 0) {
  return db.prepare(`
    SELECT ft.*, bc.name as category_name FROM financial_transactions ft
    LEFT JOIN budget_categories bc ON ft.category_id = bc.id
    WHERE ft.agent_id = ? ORDER BY ft.date DESC LIMIT ? OFFSET ?
  `).all(agentId, limit, offset);
}

export function getMonthlySpending(agentId: string) {
  const now = Math.floor(Date.now() / 1000);
  const monthStart = now - (new Date().getDate() - 1) * 86400;
  return db.prepare(`
    SELECT bc.name as category, COALESCE(SUM(ft.amount), 0) as total
    FROM budget_categories bc
    LEFT JOIN financial_transactions ft ON ft.category_id = bc.id AND ft.date >= ? AND ft.type = 'expense'
    WHERE bc.agent_id = ? GROUP BY bc.id ORDER BY total DESC
  `).all(monthStart, agentId);
}

// --- Financial Goals ---

export function createGoal(goal: {
  agentId: string; name: string; type: string;
  targetAmount: number; deadline?: number;
}) {
  const id = "fgoal_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO financial_goals (id, agent_id, name, type, target_amount, deadline) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, goal.agentId, goal.name, goal.type, goal.targetAmount, goal.deadline ?? null);
  return id;
}

export function updateGoalProgress(goalId: string, amount: number) {
  db.prepare("UPDATE financial_goals SET current_amount = current_amount + ? WHERE id = ?").run(amount, goalId);
  const goal = db.prepare("SELECT * FROM financial_goals WHERE id = ?").get(goalId) as {
    current_amount: number; target_amount: number;
  } | undefined;
  if (goal && goal.current_amount >= goal.target_amount) {
    db.prepare("UPDATE financial_goals SET status = 'completed' WHERE id = ?").run(goalId);
  }
}

export function getGoals(agentId: string) {
  return db.prepare("SELECT * FROM financial_goals WHERE agent_id = ? ORDER BY created_at DESC").all(agentId);
}

// --- Investments ---

export function addHolding(holding: {
  agentId: string; symbol: string; name?: string;
  quantity: number; avgCost: number; assetType?: string;
}) {
  const id = "hold_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO investment_holdings (id, agent_id, symbol, name, quantity, avg_cost, current_price, asset_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, holding.agentId, holding.symbol, holding.name ?? holding.symbol,
    holding.quantity, holding.avgCost, holding.avgCost, holding.assetType ?? "stock");
  return id;
}

export function getPortfolio(agentId: string) {
  return db.prepare("SELECT * FROM investment_holdings WHERE agent_id = ? ORDER BY symbol").all(agentId) as Array<{
    id: string; symbol: string; name: string; quantity: number;
    avg_cost: number; current_price: number; asset_type: string;
  }>;
}

export function getPortfolioValue(agentId: string) {
  const holdings = getPortfolio(agentId);
  let totalCost = 0;
  let totalValue = 0;
  for (const h of holdings) {
    totalCost += h.quantity * h.avg_cost;
    totalValue += h.quantity * (h.current_price ?? h.avg_cost);
  }
  return { totalCost, totalValue, gainLoss: totalValue - totalCost, holdings: holdings.length };
}

// --- Financial Health Score ---

export function calculateFinancialHealthScore(agentId: string): {
  score: number; breakdown: Record<string, number>; insights: string[];
} {
  const goals = getGoals(agentId) as Array<{ status: string; current_amount: number; target_amount: number }>;
  const spending = getMonthlySpending(agentId) as Array<{ total: number }>;
  const portfolio = getPortfolioValue(agentId);
  const categories = getCategories(agentId) as Array<{ spent: number; monthly_limit: number }>;

  const insights: string[] = [];

  // Savings rate (30%) - based on goal progress
  const activeGoals = goals.filter(g => g.status === "active");
  const avgProgress = activeGoals.length > 0
    ? activeGoals.reduce((s, g) => s + Math.min(g.current_amount / g.target_amount, 1), 0) / activeGoals.length
    : 0;
  const savingsScore = Math.round(avgProgress * 30);
  if (savingsScore < 15) insights.push("Set up more savings goals to improve your score");

  // Budget adherence (25%) - staying within limits
  const totalOverBudget = categories.reduce((s, c) => s + Math.max(0, c.spent - c.monthly_limit), 0);
  const totalLimits = categories.reduce((s, c) => s + c.monthly_limit, 0);
  const adherenceRatio = totalLimits > 0 ? Math.max(0, 1 - totalOverBudget / totalLimits) : 0.5;
  const budgetScore = Math.round(adherenceRatio * 25);
  if (totalOverBudget > 0) insights.push("You're over budget in some categories");

  // Investment diversification (15%)
  const uniqueTypes = new Set(getPortfolio(agentId).map(h => h.asset_type));
  const diversification = Math.min(uniqueTypes.size / 3, 1);
  const investScore = Math.round(diversification * 15);
  if (uniqueTypes.size < 2) insights.push("Diversify your investment portfolio");

  // Emergency fund (20%) - proxy: having a goal with good progress
  const emergencyGoal = goals.find(g => g.status === "active" && g.target_amount > 0);
  const emergencyScore = emergencyGoal
    ? Math.round(Math.min(emergencyGoal.current_amount / emergencyGoal.target_amount, 1) * 20)
    : 0;
  if (!emergencyGoal) insights.push("Create an emergency fund goal");

  // Activity (10%) - recent transactions show engagement
  const recentTx = db.prepare(
    "SELECT COUNT(*) as count FROM financial_transactions WHERE agent_id = ? AND date > ?",
  ).get(agentId, Math.floor(Date.now() / 1000) - 30 * 86400) as { count: number };
  const activityScore = Math.round(Math.min(recentTx.count / 20, 1) * 10);

  const score = savingsScore + budgetScore + investScore + emergencyScore + activityScore;

  return {
    score: Math.min(score, 100),
    breakdown: {
      savings: savingsScore, budget: budgetScore,
      investments: investScore, emergency: emergencyScore, activity: activityScore,
    },
    insights,
  };
}

// --- Alerts ---

export function createFinancialAlert(agentId: string, type: string, message: string, severity = "info") {
  const id = "falert_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO financial_alerts (id, agent_id, type, message, severity) VALUES (?, ?, ?, ?, ?)")
    .run(id, agentId, type, message, severity);
  return id;
}

export function getFinancialAlerts(agentId: string) {
  return db.prepare("SELECT * FROM financial_alerts WHERE agent_id = ? AND read = 0 ORDER BY created_at DESC LIMIT 20").all(agentId);
}

export function checkBudgetAlerts(agentId: string) {
  const categories = getCategories(agentId) as Array<{
    id: string; name: string; spent: number; monthly_limit: number;
  }>;
  for (const cat of categories) {
    updateCategorySpent(cat.id);
    const ratio = cat.monthly_limit > 0 ? cat.spent / cat.monthly_limit : 0;
    if (ratio >= 1.0) {
      createFinancialAlert(agentId, "overspend", `Over budget in ${cat.name}: spent ${cat.spent} of ${cat.monthly_limit}`, "warning");
    } else if (ratio >= 0.8) {
      createFinancialAlert(agentId, "near_limit", `${cat.name}: 80%+ of budget used (${cat.spent}/${cat.monthly_limit})`, "info");
    }
  }
}
