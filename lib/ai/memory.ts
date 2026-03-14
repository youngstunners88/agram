/**
 * Agent Memory - Long-term memory and pattern storage
 *
 * Stores interaction history, learned patterns, and preferences
 * for each agent. Uses SQLite for persistence.
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initMemoryTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      importance REAL DEFAULT 0.5,
      access_count INTEGER DEFAULT 0,
      last_accessed INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS agent_preferences (
      agent_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      updated_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (agent_id, key),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_memories_agent ON agent_memories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_memories_type ON agent_memories(type);
    CREATE INDEX IF NOT EXISTS idx_memories_importance ON agent_memories(importance);
  `);
}

/** Store a memory for an agent */
export function remember(agentId: string, type: string, content: string, importance = 0.5) {
  const id = "mem_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO agent_memories (id, agent_id, type, content, importance)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, agentId, type, content, importance);
  return id;
}

/** Recall memories by type or search */
export function recall(agentId: string, options?: {
  type?: string; search?: string; limit?: number; minImportance?: number;
}) {
  const limit = options?.limit ?? 20;
  let query = "SELECT * FROM agent_memories WHERE agent_id = ?";
  const params: unknown[] = [agentId];

  if (options?.type) {
    query += " AND type = ?";
    params.push(options.type);
  }
  if (options?.search) {
    query += " AND content LIKE ?";
    params.push(`%${options.search}%`);
  }
  if (options?.minImportance) {
    query += " AND importance >= ?";
    params.push(options.minImportance);
  }

  query += " ORDER BY importance DESC, created_at DESC LIMIT ?";
  params.push(limit);

  const memories = db.prepare(query).all(...params) as Array<{
    id: string; agent_id: string; type: string; content: string;
    importance: number; access_count: number; created_at: number;
  }>;

  // Update access counts
  for (const m of memories) {
    db.prepare(
      "UPDATE agent_memories SET access_count = access_count + 1, last_accessed = unixepoch() WHERE id = ?"
    ).run(m.id);
  }

  return memories;
}

/** Forget a specific memory */
export function forget(memoryId: string) {
  db.prepare("DELETE FROM agent_memories WHERE id = ?").run(memoryId);
}

/** Decay old, unaccessed memories (reduce importance over time) */
export function decayMemories(agentId: string, decayRate = 0.01) {
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
  db.prepare(`
    UPDATE agent_memories
    SET importance = MAX(0.1, importance - ?)
    WHERE agent_id = ? AND (last_accessed IS NULL OR last_accessed < ?)
      AND importance > 0.1
  `).run(decayRate, agentId, weekAgo);
}

/** Set a preference */
export function setPreference(agentId: string, key: string, value: string, confidence = 0.5) {
  db.prepare(`
    INSERT INTO agent_preferences (agent_id, key, value, confidence)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(agent_id, key) DO UPDATE SET
      value = excluded.value,
      confidence = excluded.confidence,
      updated_at = unixepoch()
  `).run(agentId, key, value, confidence);
}

/** Get a preference */
export function getPreference(agentId: string, key: string) {
  return db.prepare(
    "SELECT value, confidence FROM agent_preferences WHERE agent_id = ? AND key = ?"
  ).get(agentId, key) as { value: string; confidence: number } | undefined;
}

/** Get all preferences for an agent */
export function getAllPreferences(agentId: string) {
  return db.prepare(
    "SELECT key, value, confidence FROM agent_preferences WHERE agent_id = ? ORDER BY key"
  ).all(agentId) as Array<{ key: string; value: string; confidence: number }>;
}
