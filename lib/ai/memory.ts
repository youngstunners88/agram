import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export function initMemoryTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      importance REAL DEFAULT 0.5,
      last_accessed INTEGER DEFAULT (unixepoch()),
      access_count INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memory(agent_id);
    CREATE INDEX IF NOT EXISTS idx_memory_importance ON agent_memory(importance);
  `);
}

export function remember(agentId: string, content: string, importance = 0.5) {
  const id = "mem_" + Math.random().toString(36).substr(2, 8);
  const stmt = db.prepare("INSERT INTO agent_memory (id, agent_id, content, importance) VALUES (?, ?, ?, ?)");
  stmt.run(id, agentId, content, importance);
}

export function recall(agentId: string, limit = 10) {
  const stmt = db.prepare(`
    SELECT * FROM agent_memory 
    WHERE agent_id = ? 
    ORDER BY importance DESC, last_accessed DESC 
    LIMIT ?
  `);
  return stmt.all(agentId, limit);
}

export function accessMemory(memoryId: string) {
  const stmt = db.prepare(`
    UPDATE agent_memory 
    SET last_accessed = unixepoch(), access_count = access_count + 1 
    WHERE id = ?
  `);
  stmt.run(memoryId);
}

export function decayMemory() {
  const stmt = db.prepare(`
    UPDATE agent_memory 
    SET importance = importance * 0.95
    WHERE unixepoch() - last_accessed > 604800
  `);
  stmt.run();
}
