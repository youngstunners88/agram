import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export function initPersonaTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_persona (
      agent_id TEXT PRIMARY KEY,
      tone TEXT DEFAULT 'neutral',
      verbosity INTEGER DEFAULT 50,
      formality INTEGER DEFAULT 50,
      humor INTEGER DEFAULT 30,
      greeting_template TEXT,
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);
}

export function setPersona(agentId: string, traits: {
  tone?: string;
  verbosity?: number;
  formality?: number;
  humor?: number;
  greeting_template?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO agent_persona (agent_id, tone, verbosity, formality, humor, greeting_template)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      tone = excluded.tone,
      verbosity = excluded.verbosity,
      formality = excluded.formality,
      humor = excluded.humor,
      greeting_template = excluded.greeting_template,
      updated_at = unixepoch()
  `);
  stmt.run(
    agentId,
    traits.tone ?? 'neutral',
    traits.verbosity ?? 50,
    traits.formality ?? 50,
    traits.humor ?? 30,
    traits.greeting_template ?? 'Hello, I am {{name}}. How can I assist you?'
  );
}

export function getPersona(agentId: string) {
  const stmt = db.prepare("SELECT * FROM agent_persona WHERE agent_id = ?");
  return stmt.get(agentId);
}
