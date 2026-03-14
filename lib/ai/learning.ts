/**
 * Agent Learning - Experience-based skill improvement
 *
 * Tracks agent interactions, identifies patterns,
 * and improves performance metrics over time.
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initLearningTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_events (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      outcome TEXT NOT NULL,
      context TEXT,
      score REAL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS skill_progress (
      agent_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      level REAL DEFAULT 1.0,
      experience_points INTEGER DEFAULT 0,
      last_improved_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (agent_id, skill),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_learning_agent ON learning_events(agent_id);
    CREATE INDEX IF NOT EXISTS idx_learning_type ON learning_events(event_type);
  `);
}

/** Record a learning event (interaction outcome) */
export function recordEvent(agentId: string, eventType: string, outcome: "success" | "failure" | "neutral", context?: string, score?: number) {
  const id = "learn_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO learning_events (id, agent_id, event_type, outcome, context, score)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, agentId, eventType, outcome, context ?? null, score ?? null);

  // Auto-improve related skill on success
  if (outcome === "success") {
    improveSkill(agentId, eventType, 10);
  }

  return id;
}

/** Improve a skill by adding experience points */
export function improveSkill(agentId: string, skill: string, xp: number) {
  const existing = db.prepare(
    "SELECT * FROM skill_progress WHERE agent_id = ? AND skill = ?"
  ).get(agentId, skill) as { level: number; experience_points: number } | undefined;

  if (existing) {
    const newXp = existing.experience_points + xp;
    // Level up every 100 XP, with diminishing returns
    const newLevel = 1 + Math.log2(1 + newXp / 100);
    db.prepare(`
      UPDATE skill_progress SET experience_points = ?, level = ?, last_improved_at = unixepoch()
      WHERE agent_id = ? AND skill = ?
    `).run(newXp, Math.round(newLevel * 100) / 100, agentId, skill);
  } else {
    db.prepare(`
      INSERT INTO skill_progress (agent_id, skill, experience_points, level)
      VALUES (?, ?, ?, 1.0)
    `).run(agentId, skill, xp);
  }
}

/** Get all skill levels for an agent */
export function getSkillLevels(agentId: string) {
  return db.prepare(
    "SELECT skill, level, experience_points FROM skill_progress WHERE agent_id = ? ORDER BY level DESC"
  ).all(agentId) as Array<{ skill: string; level: number; experience_points: number }>;
}

/** Get success rate for a specific event type */
export function getSuccessRate(agentId: string, eventType: string): {
  total: number; successes: number; rate: number;
} {
  const total = (db.prepare(
    "SELECT COUNT(*) as count FROM learning_events WHERE agent_id = ? AND event_type = ?"
  ).get(agentId, eventType) as { count: number }).count;

  const successes = (db.prepare(
    "SELECT COUNT(*) as count FROM learning_events WHERE agent_id = ? AND event_type = ? AND outcome = 'success'"
  ).get(agentId, eventType) as { count: number }).count;

  return { total, successes, rate: total > 0 ? successes / total : 0 };
}

/** Get learning summary for an agent */
export function getLearningProfile(agentId: string) {
  const skills = getSkillLevels(agentId);
  const totalEvents = (db.prepare(
    "SELECT COUNT(*) as count FROM learning_events WHERE agent_id = ?"
  ).get(agentId) as { count: number }).count;

  const recentSuccessRate = (() => {
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
    const recent = db.prepare(
      "SELECT outcome, COUNT(*) as count FROM learning_events WHERE agent_id = ? AND created_at > ? GROUP BY outcome"
    ).all(agentId, weekAgo) as Array<{ outcome: string; count: number }>;

    const total = recent.reduce((s, r) => s + r.count, 0);
    const success = recent.find((r) => r.outcome === "success")?.count ?? 0;
    return total > 0 ? success / total : 0;
  })();

  return {
    skills,
    totalEvents,
    recentSuccessRate: Math.round(recentSuccessRate * 100) / 100,
    topSkill: skills[0]?.skill ?? "none",
  };
}
