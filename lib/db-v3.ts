/**
 * V3 Database Tables - Extends the V2 schema with new capabilities
 *
 * New tables: agent_skills, tasks, agent_health, recommendations_log
 * Does NOT modify existing tables.
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initV3Tables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_skills (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      description TEXT,
      proficiency INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(agent_id, skill_name)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      assignee_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open',
      priority INTEGER DEFAULT 1,
      required_skill TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      completed_at INTEGER,
      FOREIGN KEY (creator_id) REFERENCES agents(id),
      FOREIGN KEY (assignee_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS agent_health (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      last_signal_at INTEGER,
      last_message_at INTEGER,
      error_count INTEGER DEFAULT 0,
      uptime_score INTEGER DEFAULT 100,
      checked_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(agent_id)
    );

    CREATE INDEX IF NOT EXISTS idx_skills_agent ON agent_skills(agent_id);
    CREATE INDEX IF NOT EXISTS idx_skills_name ON agent_skills(skill_name);
    CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_health_agent ON agent_health(agent_id);
  `);
}

// --- Skills ---

export function addSkill(agentId: string, skillName: string, description?: string, proficiency = 1) {
  const id = "skill_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT OR REPLACE INTO agent_skills (id, agent_id, skill_name, description, proficiency)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, agentId, skillName, description ?? null, proficiency);
  return id;
}

export function getAgentSkills(agentId: string) {
  return db.prepare(
    "SELECT * FROM agent_skills WHERE agent_id = ? ORDER BY proficiency DESC"
  ).all(agentId) as Array<{
    id: string; agent_id: string; skill_name: string;
    description: string | null; proficiency: number; created_at: number;
  }>;
}

export function findAgentsBySkill(skillName: string) {
  return db.prepare(`
    SELECT a.id, a.name, a.purpose, s.skill_name, s.proficiency
    FROM agent_skills s
    JOIN agents a ON s.agent_id = a.id
    WHERE s.skill_name LIKE ?
    ORDER BY s.proficiency DESC
  `).all(`%${skillName}%`) as Array<{
    id: string; name: string; purpose: string;
    skill_name: string; proficiency: number;
  }>;
}

export function listAllSkills() {
  return db.prepare(`
    SELECT skill_name, COUNT(*) as agent_count, AVG(proficiency) as avg_proficiency
    FROM agent_skills
    GROUP BY skill_name
    ORDER BY agent_count DESC
  `).all() as Array<{ skill_name: string; agent_count: number; avg_proficiency: number }>;
}

// --- Tasks ---

export function createTask(task: {
  creator_id: string;
  title: string;
  description?: string;
  priority?: number;
  required_skill?: string;
}) {
  const id = "task_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO tasks (id, creator_id, title, description, priority, required_skill)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, task.creator_id, task.title, task.description ?? null, task.priority ?? 1, task.required_skill ?? null);
  return id;
}

export function assignTask(taskId: string, assigneeId: string) {
  db.prepare(`
    UPDATE tasks SET assignee_id = ?, status = 'assigned', updated_at = unixepoch()
    WHERE id = ?
  `).run(assigneeId, taskId);
}

export function updateTaskStatus(taskId: string, status: string) {
  const completedAt = status === "completed" ? ", completed_at = unixepoch()" : "";
  db.prepare(`
    UPDATE tasks SET status = ?, updated_at = unixepoch() ${completedAt}
    WHERE id = ?
  `).run(status, taskId);
}

export function getTask(taskId: string) {
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as {
    id: string; creator_id: string; assignee_id: string | null;
    title: string; description: string | null; status: string;
    priority: number; required_skill: string | null;
    created_at: number; updated_at: number; completed_at: number | null;
  } | undefined;
}

export function getTasksByAgent(agentId: string, role: "creator" | "assignee" = "creator") {
  const column = role === "creator" ? "creator_id" : "assignee_id";
  return db.prepare(`
    SELECT * FROM tasks WHERE ${column} = ? ORDER BY updated_at DESC
  `).all(agentId) as Array<{
    id: string; creator_id: string; assignee_id: string | null;
    title: string; description: string | null; status: string;
    priority: number; created_at: number;
  }>;
}

export function getOpenTasks(skill?: string) {
  if (skill) {
    return db.prepare(`
      SELECT t.*, a.name as creator_name
      FROM tasks t JOIN agents a ON t.creator_id = a.id
      WHERE t.status = 'open' AND t.required_skill LIKE ?
      ORDER BY t.priority DESC, t.created_at DESC
    `).all(`%${skill}%`);
  }
  return db.prepare(`
    SELECT t.*, a.name as creator_name
    FROM tasks t JOIN agents a ON t.creator_id = a.id
    WHERE t.status = 'open'
    ORDER BY t.priority DESC, t.created_at DESC
  `).all();
}

// --- Health ---

export function upsertHealth(agentId: string, updates: {
  status?: string;
  lastSignalAt?: number;
  lastMessageAt?: number;
  errorCount?: number;
  uptimeScore?: number;
}) {
  const existing = db.prepare("SELECT * FROM agent_health WHERE agent_id = ?").get(agentId);
  if (existing) {
    const sets: string[] = ["checked_at = unixepoch()"];
    const vals: unknown[] = [];
    if (updates.status !== undefined) { sets.push("status = ?"); vals.push(updates.status); }
    if (updates.lastSignalAt !== undefined) { sets.push("last_signal_at = ?"); vals.push(updates.lastSignalAt); }
    if (updates.lastMessageAt !== undefined) { sets.push("last_message_at = ?"); vals.push(updates.lastMessageAt); }
    if (updates.errorCount !== undefined) { sets.push("error_count = ?"); vals.push(updates.errorCount); }
    if (updates.uptimeScore !== undefined) { sets.push("uptime_score = ?"); vals.push(updates.uptimeScore); }
    vals.push(agentId);
    db.prepare(`UPDATE agent_health SET ${sets.join(", ")} WHERE agent_id = ?`).run(...vals);
  } else {
    const id = "health_" + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO agent_health (id, agent_id, status, last_signal_at, last_message_at, error_count, uptime_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, agentId,
      updates.status ?? "active",
      updates.lastSignalAt ?? null,
      updates.lastMessageAt ?? null,
      updates.errorCount ?? 0,
      updates.uptimeScore ?? 100
    );
  }
}

export function getAgentHealth(agentId: string) {
  return db.prepare("SELECT * FROM agent_health WHERE agent_id = ?").get(agentId) as {
    id: string; agent_id: string; status: string;
    last_signal_at: number | null; last_message_at: number | null;
    error_count: number; uptime_score: number; checked_at: number;
  } | undefined;
}

// --- Recommendations ---

export function getRecommendedAgents(agentId: string, limit = 10) {
  // Recommend agents that share skills with this agent but aren't already followed
  return db.prepare(`
    SELECT a.id, a.name, a.purpose, COUNT(s2.skill_name) as shared_skills
    FROM agents a
    JOIN agent_skills s2 ON a.id = s2.agent_id
    WHERE s2.skill_name IN (
      SELECT skill_name FROM agent_skills WHERE agent_id = ?
    )
    AND a.id != ?
    AND a.id NOT IN (SELECT followee_id FROM follows WHERE follower_id = ?)
    GROUP BY a.id
    ORDER BY shared_skills DESC
    LIMIT ?
  `).all(agentId, agentId, agentId, limit) as Array<{
    id: string; name: string; purpose: string; shared_skills: number;
  }>;
}

export function getRecommendedTasks(agentId: string, limit = 10) {
  // Recommend open tasks matching agent skills
  return db.prepare(`
    SELECT t.*, a.name as creator_name
    FROM tasks t
    JOIN agents a ON t.creator_id = a.id
    WHERE t.status = 'open'
    AND t.creator_id != ?
    AND t.required_skill IN (
      SELECT skill_name FROM agent_skills WHERE agent_id = ?
    )
    ORDER BY t.priority DESC
    LIMIT ?
  `).all(agentId, agentId, limit);
}
