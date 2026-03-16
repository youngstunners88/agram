/**
 * AgentGram V5 Migration
 * Initialize all database tables for Phase 5-8 features
 */

import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

console.log("🚀 AgentGram V5 Migration Starting...\n");

// Core tables (from V2-V4)
db.exec(`
  -- Agents
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    purpose TEXT,
    api_key TEXT UNIQUE,
    api_endpoint TEXT,
    verified INTEGER DEFAULT 0,
    badge TEXT DEFAULT 'unverified',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );
  
  -- Signals
  CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  -- Follows
  CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    followee_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (follower_id, followee_id),
    FOREIGN KEY (follower_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (followee_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  -- Messages
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    timestamp INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (sender_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  -- Threads (replies to signals)
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    parent_signal_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (parent_signal_id) REFERENCES signals(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  -- Circles (agent groups)
  CREATE TABLE IF NOT EXISTS circles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    purpose TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (created_by) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS circle_members (
    circle_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (circle_id, agent_id),
    FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  -- Analytics
  CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    signals_24h INTEGER DEFAULT 0,
    signals_7d INTEGER DEFAULT 0,
    followers INTEGER DEFAULT 0,
    engagement_score REAL DEFAULT 0,
    timestamp INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
`);

console.log("✅ Core tables created");

// Phase 5: Economy tables
db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    agent_id TEXT PRIMARY KEY,
    balance REAL DEFAULT 0,
    staked REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    escrow_id TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (from_agent) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (to_agent) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS escrow (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    amount REAL NOT NULL,
    conditions TEXT,
    status TEXT DEFAULT 'held',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS staking (
    agent_id TEXT PRIMARY KEY,
    amount REAL DEFAULT 0,
    apy REAL DEFAULT 0.05,
    last_compound INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS service_listings (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT,
    active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS service_orders (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (listing_id) REFERENCES service_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES agents(id) ON DELETE CASCADE
  );
`);

console.log("✅ Phase 5: Economy tables created");

// Phase 5: Swarm tables
db.exec(`
  CREATE TABLE IF NOT EXISTS swarms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    purpose TEXT,
    creator_id TEXT NOT NULL,
    voting_mode TEXT DEFAULT 'majority',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (creator_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS swarm_members (
    swarm_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (swarm_id, agent_id),
    FOREIGN KEY (swarm_id) REFERENCES swarms(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    swarm_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (swarm_id) REFERENCES swarms(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES agents(id) ON DELETE SET NULL
  );
  
  CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    swarm_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    voting_mode TEXT,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (swarm_id) REFERENCES swarms(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS votes (
    proposal_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    vote TEXT NOT NULL,
    voted_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (proposal_id, agent_id),
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
`);

console.log("✅ Phase 5: Swarm tables created");

// Phase 5-6: AI tables
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_memory (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    importance REAL DEFAULT 0.5,
    last_accessed INTEGER DEFAULT (unixepoch()),
    access_count INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memory(agent_id);
  CREATE INDEX IF NOT EXISTS idx_memory_importance ON agent_memory(importance DESC, last_accessed DESC);
  
  CREATE TABLE IF NOT EXISTS agent_persona (
    agent_id TEXT PRIMARY KEY,
    tone TEXT DEFAULT 'neutral',
    verbosity INTEGER DEFAULT 50,
    formality INTEGER DEFAULT 50,
    humor INTEGER DEFAULT 30,
    greeting_template TEXT,
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS agent_skills (
    agent_id TEXT NOT NULL,
    skill TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    PRIMARY KEY (agent_id, skill),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
`);

console.log("✅ Phase 5-6: AI tables created");

// Phase 6: Life Management tables
db.exec(`
  CREATE TABLE IF NOT EXISTS budget_categories (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    name TEXT NOT NULL,
    allocated REAL NOT NULL,
    spent REAL DEFAULT 0,
    period TEXT DEFAULT 'monthly',
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS financial_goals (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline INTEGER,
    priority INTEGER DEFAULT 5,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    shares REAL NOT NULL,
    purchase_price REAL NOT NULL,
    purchase_date INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    last_completed INTEGER,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS sleep_logs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    bedtime INTEGER,
    wake_time INTEGER,
    quality INTEGER,
    date INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    duration INTEGER NOT NULL,
    task TEXT,
    completed INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS nutrition_logs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fat REAL,
    logged_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS fitness_workouts (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER,
    calories_burned INTEGER,
    intensity INTEGER,
    completed_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS symptoms (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    description TEXT NOT NULL,
    severity INTEGER,
    duration TEXT,
    logged_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    next_dose INTEGER,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
`);

console.log("✅ Phase 6: Life Management tables created");

// Phase 8: Intelligence & Governance tables
db.exec(`
  CREATE TABLE IF NOT EXISTS reasoning_logs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    steps TEXT NOT NULL,
    conclusion TEXT,
    confidence REAL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    goal TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    completed_at INTEGER,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS plan_tasks (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    dependencies TEXT,
    effort_score INTEGER DEFAULT 5,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS dao_proposals (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    action_type TEXT,
    action_params TEXT,
    status TEXT DEFAULT 'open',
    voting_mode TEXT DEFAULT 'majority',
    deadline INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS dao_votes (
    proposal_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    vote TEXT NOT NULL,
    voting_power REAL DEFAULT 1,
    voted_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (proposal_id, agent_id),
    FOREIGN KEY (proposal_id) REFERENCES dao_proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
`);

console.log("✅ Phase 8: Intelligence & Governance tables created");

// Additional utility tables
db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_signals (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT NOT NULL,
    secret TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
  
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
    PRIMARY KEY (agent_id, plugin_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
  );
`);

console.log("✅ Utility tables created");

// Get final count
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
console.log(`\n🎉 Migration Complete! ${tables.length} tables created.`);
console.log("\nTables:");
tables.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));

db.close();
