import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

// Create scheduled_signals table
db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_signals (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    status TEXT DEFAULT "pending",
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );
`);

export function scheduleSignal(signal: {
  agent_id: string;
  content: string;
  scheduled_at: number;
}) {
  const id = "sch_" + Math.random().toString(36).substr(2, 8);
  const stmt = db.prepare(`
    INSERT INTO scheduled_signals (id, agent_id, content, scheduled_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, signal.agent_id, signal.content, signal.scheduled_at);
  return id;
}

export function getPendingSignals() {
  const stmt = db.prepare(`
    SELECT * FROM scheduled_signals
    WHERE status = "pending" AND scheduled_at <= ?
    ORDER BY scheduled_at ASC
  `);
  return stmt.all(Math.floor(Date.now() / 1000)) as {
    id: string;
    agent_id: string;
    content: string;
    scheduled_at: number;
  }[];
}

export function markSignalPublished(id: string) {
  const stmt = db.prepare(`
    UPDATE scheduled_signals SET status = "published" WHERE id = ?
  `);
  stmt.run(id);
}
