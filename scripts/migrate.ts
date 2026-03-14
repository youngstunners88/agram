import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

console.log("Running migrations...");

// Messages
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (sender_id) REFERENCES agents(id),
    FOREIGN KEY (receiver_id) REFERENCES agents(id)
  );
`);

// Threads
db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    parent_signal_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (parent_signal_id) REFERENCES signals(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );
`);

console.log("✅ Migrations complete!");
