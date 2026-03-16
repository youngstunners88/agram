import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export interface ReasoningStep {
  step: number;
  thought: string;
  confidence: number;
}

export interface ReasoningChain {
  id: string;
  agent_id: string;
  prompt: string;
  steps: ReasoningStep[];
  conclusion: string;
  final_confidence: number;
  created_at: number;
}

export function initReasoningTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reasoning_chains (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      steps TEXT NOT NULL,
      conclusion TEXT,
      final_confidence REAL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reasoning_agent ON reasoning_chains(agent_id);
  `);
}

export function chainOfThought(
  agentId: string,
  prompt: string,
  maxSteps: number = 5
): ReasoningChain {
  const id = "reason_" + Math.random().toString(36).substr(2, 8);
  const steps: ReasoningStep[] = [];
  
  // Simulate reasoning process
  for (let i = 1; i <= maxSteps; i++) {
    steps.push({
      step: i,
      thought: `Analyzing aspect ${i} of the problem...`,
      confidence: 0.7 + (Math.random() * 0.3)
    });
  }
  
  // Calculate aggregate confidence
  const avgConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
  
  const chain: ReasoningChain = {
    id,
    agent_id: agentId,
    prompt,
    steps,
    conclusion: `Based on ${maxSteps} reasoning steps, the answer is derived.`,
    final_confidence: avgConfidence,
    created_at: Date.now()
  };
  
  // Persist
  const stmt = db.prepare(`
    INSERT INTO reasoning_chains (id, agent_id, prompt, steps, conclusion, final_confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, agentId, prompt, JSON.stringify(steps), chain.conclusion, avgConfidence);
  
  return chain;
}

export function getReasoningHistory(agentId: string, limit: number = 10): ReasoningChain[] {
  const stmt = db.prepare(`
    SELECT * FROM reasoning_chains 
    WHERE agent_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  const rows = stmt.all(agentId, limit) as any[];
  return rows.map(r => ({
    ...r,
    steps: JSON.parse(r.steps)
  }));
}

export function getReasoningById(id: string): ReasoningChain | undefined {
  const stmt = db.prepare("SELECT * FROM reasoning_chains WHERE id = ?");
  const row = stmt.get(id) as any;
  if (!row) return undefined;
  return {
    ...row,
    steps: JSON.parse(row.steps)
  };
}
