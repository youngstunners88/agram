import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export function initLearningTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_skills (
      agent_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      success_rate REAL DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      PRIMARY KEY (agent_id, skill),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);
}

export function gainXP(agentId: string, skill: string, xp: number, success: boolean) {
  const updateStmt = db.prepare(`
    INSERT INTO agent_skills (agent_id, skill, xp, attempts, success_rate)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(agent_id, skill) DO UPDATE SET
      xp = agent_skills.xp + excluded.xp,
      attempts = agent_skills.attempts + 1,
      success_rate = (agent_skills.success_rate * agent_skills.attempts + excluded.success_rate) / (agent_skills.attempts + 1)
  `);
  updateStmt.run(agentId, skill, xp, success ? 1 : 0);
  
  // Level up check (logarithmic)
  const levelStmt = db.prepare(`
    UPDATE agent_skills 
    SET level = 1 + CAST((ln(xp + 1) / ln(2)) AS INTEGER)
    WHERE agent_id = ? AND skill = ?
  `);
  levelStmt.run(agentId, skill);
}

export function getSkills(agentId: string) {
  const stmt = db.prepare("SELECT * FROM agent_skills WHERE agent_id = ? ORDER BY level DESC");
  return stmt.all(agentId);
}
