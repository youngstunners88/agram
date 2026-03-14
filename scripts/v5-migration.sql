-- Economy tables
CREATE TABLE IF NOT EXISTS wallets (agent_id TEXT PRIMARY KEY, balance REAL DEFAULT 0, staked REAL DEFAULT 0, created_at INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, from_agent TEXT NOT NULL, to_agent TEXT NOT NULL, amount REAL NOT NULL, type TEXT NOT NULL, status TEXT DEFAULT 'pending', escrow_id TEXT, created_at INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS escrow (id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL, amount REAL NOT NULL, conditions TEXT, status TEXT DEFAULT 'held', created_at INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS staking (agent_id TEXT PRIMARY KEY, amount REAL DEFAULT 0, apy REAL DEFAULT 0.05, last_compound INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS service_listings (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, price REAL NOT NULL, category TEXT, active INTEGER DEFAULT 1, created_at INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS service_orders (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL, buyer_id TEXT NOT NULL, seller_id TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at INTEGER DEFAULT (unixepoch()));

-- Swarm tables
CREATE TABLE IF NOT EXISTS swarms (id TEXT PRIMARY KEY, name TEXT NOT NULL, purpose TEXT, creator_id TEXT NOT NULL, voting_mode TEXT DEFAULT 'majority', created_at INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS swarm_members (swarm_id TEXT NOT NULL, agent_id TEXT NOT NULL, role TEXT DEFAULT 'member', joined_at INTEGER DEFAULT (unixepoch()), PRIMARY KEY (swarm_id, agent_id));
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, swarm_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, assigned_to TEXT, status TEXT DEFAULT 'open', created_at INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, swarm_id TEXT NOT NULL, agent_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, voting_mode TEXT, status TEXT DEFAULT 'open', created_at INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS votes (proposal_id TEXT NOT NULL, agent_id TEXT NOT NULL, vote TEXT NOT NULL, voted_at INTEGER DEFAULT (unixepoch()), PRIMARY KEY (proposal_id, agent_id));

-- AI tables
CREATE TABLE IF NOT EXISTS agent_memory (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, content TEXT NOT NULL, importance REAL DEFAULT 0.5, last_accessed INTEGER DEFAULT (unixepoch()), access_count INTEGER DEFAULT 1, created_at INTEGER DEFAULT (unixepoch()));
CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON agent_memory(importance);
CREATE TABLE IF NOT EXISTS agent_persona (agent_id TEXT PRIMARY KEY, tone TEXT DEFAULT 'neutral', verbosity INTEGER DEFAULT 50, formality INTEGER DEFAULT 50, humor INTEGER DEFAULT 30, greeting_template TEXT, updated_at INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS agent_skills (agent_id TEXT NOT NULL, skill TEXT NOT NULL, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, success_rate REAL DEFAULT 0, attempts INTEGER DEFAULT 0, PRIMARY KEY (agent_id, skill));

SELECT 'V5 Migration Complete' as status;
