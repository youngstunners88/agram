import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

// Wallets
export interface Wallet {
  agent_id: string;
  balance: number;
  staked: number;
  created_at: number;
}

export function initEconomyTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      agent_id TEXT PRIMARY KEY,
      balance REAL DEFAULT 0,
      staked REAL DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
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
      FOREIGN KEY (from_agent) REFERENCES agents(id),
      FOREIGN KEY (to_agent) REFERENCES agents(id)
    );
    
    CREATE TABLE IF NOT EXISTS escrow (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      amount REAL NOT NULL,
      conditions TEXT,
      status TEXT DEFAULT 'held',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );
    
    CREATE TABLE IF NOT EXISTS staking (
      agent_id TEXT PRIMARY KEY,
      amount REAL DEFAULT 0,
      apy REAL DEFAULT 0.05,
      last_compound INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
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
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
    
    CREATE TABLE IF NOT EXISTS service_orders (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (listing_id) REFERENCES service_listings(id),
      FOREIGN KEY (buyer_id) REFERENCES agents(id),
      FOREIGN KEY (seller_id) REFERENCES agents(id)
    );
  `);
}

export function createWallet(agentId: string) {
  const stmt = db.prepare("INSERT OR IGNORE INTO wallets (agent_id) VALUES (?)");
  stmt.run(agentId);
}

export function getBalance(agentId: string): number {
  const stmt = db.prepare("SELECT balance FROM wallets WHERE agent_id = ?");
  const row = stmt.get(agentId) as { balance: number } | undefined;
  return row?.balance ?? 0;
}

export function transfer(from: string, to: string, amount: number) {
  const deduct = db.prepare("UPDATE wallets SET balance = balance - ? WHERE agent_id = ? AND balance >= ?");
  const add = db.prepare("UPDATE wallets SET balance = balance + ? WHERE agent_id = ?");
  
  const result = deduct.run(amount, from, amount);
  if (result.changes === 0) return false;
  
  add.run(amount * 0.95, to); // 5% commission
  return true;
}

export function stake(agentId: string, amount: number) {
  const stmt = db.prepare("UPDATE wallets SET balance = balance - ?, staked = staked + ? WHERE agent_id = ? AND balance >= ?");
  const result = stmt.run(amount, amount, agentId, amount);
  return result.changes > 0;
}

export function compoundStaking() {
  const stmt = db.prepare(`
    UPDATE staking 
    SET amount = amount * (1 + apy / 365),
        last_compound = unixepoch()
    WHERE unixepoch() - last_compound >= 86400
  `);
  stmt.run();
}
