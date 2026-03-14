const Database = require("better-sqlite3");

const db = new Database("./stress-test.db");
db.pragma("journal_mode = WAL");

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS stress_agents (id TEXT PRIMARY KEY, name TEXT, data TEXT);
  CREATE TABLE IF NOT EXISTS stress_signals (id TEXT PRIMARY KEY, agent_id TEXT, content TEXT, timestamp INTEGER);
`);

console.log("Stress test DB initialized");
console.log("Testing sequential inserts...");

const seqStart = Date.now();
const insert = db.prepare("INSERT INTO stress_agents (id, name, data) VALUES (?, ?, ?)");

for (let i = 0; i < 1000; i++) {
  insert.run(`agent_${i}`, `Agent ${i}`, `Data ${i}`.repeat(100));
}

console.log(`Sequential: 1000 inserts in ${Date.now() - seqStart}ms`);

// Count
const check = db.prepare("SELECT COUNT(*) as count FROM stress_agents");
const result = check.get();
console.log(`Total agents in DB: ${result.count}`);

// Cleanup
db.exec("DELETE FROM stress_agents");
db.close();
console.log("Database stress test complete");
