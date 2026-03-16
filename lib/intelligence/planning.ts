import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export interface PlanTask {
  id: string;
  description: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  effort_score: number;
  assigned_to?: string;
  completed_at?: number;
}

export interface Plan {
  id: string;
  agent_id: string;
  goal: string;
  status: 'draft' | 'active' | 'completed' | 'abandoned';
  tasks: PlanTask[];
  estimated_effort: number;
  created_at: number;
  updated_at: number;
}

export function initPlanningTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      estimated_effort INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS plan_tasks (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      description TEXT NOT NULL,
      dependencies TEXT,
      status TEXT DEFAULT 'pending',
      effort_score INTEGER DEFAULT 1,
      assigned_to TEXT,
      completed_at INTEGER,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES agents(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan ON plan_tasks(plan_id);
  `);
}

export function createPlan(agentId: string, goal: string): string {
  const id = "plan_" + Math.random().toString(36).substr(2, 8);
  
  // Break goal into sub-tasks
  const tasks = decomposeGoal(goal);
  const totalEffort = tasks.reduce((sum, t) => sum + t.effort_score, 0);
  
  // Create plan
  const stmt = db.prepare(`
    INSERT INTO plans (id, agent_id, goal, estimated_effort)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, agentId, goal, totalEffort);
  
  // Create tasks
  const taskStmt = db.prepare(`
    INSERT INTO plan_tasks (id, plan_id, description, dependencies, effort_score)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  for (const task of tasks) {
    taskStmt.run(
      "task_" + Math.random().toString(36).substr(2, 8),
      id,
      task.description,
      JSON.stringify(task.dependencies),
      task.effort_score
    );
  }
  
  return id;
}

function decomposeGoal(goal: string): PlanTask[] {
  // Simple goal decomposition - in production this would use LLM
  const tasks: PlanTask[] = [];
  
  if (goal.toLowerCase().includes("marketing campaign")) {
    tasks.push(
      { id: "", description: "Research target audience", dependencies: [], status: 'pending', effort_score: 3 },
      { id: "", description: "Create content strategy", dependencies: [], status: 'pending', effort_score: 4 },
      { id: "", description: "Design visual assets", dependencies: ["1"], status: 'pending', effort_score: 5 },
      { id: "", description: "Set up ad campaigns", dependencies: ["0", "1"], status: 'pending', effort_score: 2 },
      { id: "", description: "Launch and monitor", dependencies: ["2", "3"], status: 'pending', effort_score: 2 }
    );
  } else {
    // Generic 3-step plan
    tasks.push(
      { id: "", description: "Research and analyze", dependencies: [], status: 'pending', effort_score: 3 },
      { id: "", description: "Execute primary task", dependencies: ["0"], status: 'pending', effort_score: 5 },
      { id: "", description: "Review and finalize", dependencies: ["1"], status: 'pending', effort_score: 2 }
    );
  }
  
  return tasks;
}

export function getPlan(planId: string): Plan | undefined {
  const planStmt = db.prepare("SELECT * FROM plans WHERE id = ?");
  const planRow = planStmt.get(planId) as any;
  if (!planRow) return undefined;
  
  const taskStmt = db.prepare("SELECT * FROM plan_tasks WHERE plan_id = ?");
  const taskRows = taskStmt.all(planId) as any[];
  
  return {
    ...planRow,
    tasks: taskRows.map(t => ({
      ...t,
      dependencies: JSON.parse(t.dependencies || '[]')
    }))
  };
}

export function getAgentPlans(agentId: string): Plan[] {
  const stmt = db.prepare(`
    SELECT * FROM plans WHERE agent_id = ? ORDER BY created_at DESC
  `);
  const plans = stmt.all(agentId) as any[];
  
  return plans.map(p => ({
    ...p,
    tasks: [] // Lazy load tasks separately if needed
  }));
}

export function updateTaskStatus(taskId: string, status: PlanTask['status']) {
  const stmt = db.prepare(`
    UPDATE plan_tasks 
    SET status = ?, completed_at = ?
    WHERE id = ?
  `);
  stmt.run(status, status === 'completed' ? Date.now() : null, taskId);
}

export function getExecutableTasks(planId: string): PlanTask[] {
  const stmt = db.prepare("SELECT * FROM plan_tasks WHERE plan_id = ? AND status = 'pending'");
  const tasks = stmt.all(planId) as any[];
  
  return tasks
    .map(t => ({ ...t, dependencies: JSON.parse(t.dependencies || '[]') }))
    .filter(t => t.dependencies.length === 0); // Tasks with no dependencies ready to execute
}
