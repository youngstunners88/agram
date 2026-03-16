import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: string[];
  active: boolean;
  created_at: number;
}

export function initPluginTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      author TEXT NOT NULL,
      description TEXT,
      permissions TEXT,
      active INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    );
    
    CREATE TABLE IF NOT EXISTS agent_plugins (
      agent_id TEXT NOT NULL,
      plugin_id TEXT NOT NULL,
      config TEXT,
      installed_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (agent_id, plugin_id)
    );
  `);
}

export function registerPlugin(plugin: Omit<Plugin, 'id' | 'active' | 'created_at'>): string {
  const id = "plugin_" + Math.random().toString(36).substr(2, 8);
  const stmt = db.prepare(`
    INSERT INTO plugins (id, name, version, author, description, permissions)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, plugin.name, plugin.version, plugin.author, plugin.description, JSON.stringify(plugin.permissions));
  return id;
}

export function getPlugins(): Plugin[] {
  const stmt = db.prepare("SELECT * FROM plugins WHERE active = 1");
  const rows = stmt.all() as any[];
  return rows.map(r => ({ ...r, permissions: JSON.parse(r.permissions || '[]') }));
}

export function installPlugin(agentId: string, pluginId: string, config: Record<string, unknown> = {}) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO agent_plugins (agent_id, plugin_id, config)
    VALUES (?, ?, ?)
  `);
  stmt.run(agentId, pluginId, JSON.stringify(config));
}
