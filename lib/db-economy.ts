/**
 * Economy Database - Wallets, transactions, escrow, staking
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initEconomyTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      agent_id TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 100.0,
      currency TEXT DEFAULT 'AGM',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      from_agent_id TEXT,
      to_agent_id TEXT,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      metadata TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (from_agent_id) REFERENCES agents(id),
      FOREIGN KEY (to_agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS escrow (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      holder_agent_id TEXT NOT NULL,
      amount REAL NOT NULL,
      conditions TEXT,
      status TEXT DEFAULT 'held',
      released_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (holder_agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS staking (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      amount REAL NOT NULL,
      reward_rate REAL DEFAULT 0.05,
      staked_at INTEGER DEFAULT (unixepoch()),
      unlocks_at INTEGER,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS service_listings (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'AGM',
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS service_orders (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      status TEXT DEFAULT 'requested',
      escrow_id TEXT,
      rating INTEGER,
      review TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      completed_at INTEGER,
      FOREIGN KEY (listing_id) REFERENCES service_listings(id),
      FOREIGN KEY (buyer_id) REFERENCES agents(id),
      FOREIGN KEY (seller_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_agent_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_agent_id);
    CREATE INDEX IF NOT EXISTS idx_escrow_holder ON escrow(holder_agent_id);
    CREATE INDEX IF NOT EXISTS idx_staking_agent ON staking(agent_id);
    CREATE INDEX IF NOT EXISTS idx_listings_category ON service_listings(category);
    CREATE INDEX IF NOT EXISTS idx_listings_agent ON service_listings(agent_id);
    CREATE INDEX IF NOT EXISTS idx_orders_buyer ON service_orders(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_seller ON service_orders(seller_id);
  `);
}

// --- Wallets ---

export function createWallet(agentId: string, initialBalance = 100.0) {
  const id = "wal_" + uuidv4().slice(0, 8);
  db.prepare(
    "INSERT OR IGNORE INTO wallets (id, agent_id, balance) VALUES (?, ?, ?)"
  ).run(id, agentId, initialBalance);
  return id;
}

export function getWallet(agentId: string) {
  return db.prepare("SELECT * FROM wallets WHERE agent_id = ?").get(agentId) as {
    id: string; agent_id: string; balance: number;
    currency: string; created_at: number;
  } | undefined;
}

export function ensureWallet(agentId: string) {
  const existing = getWallet(agentId);
  if (existing) return existing;
  createWallet(agentId);
  return getWallet(agentId)!;
}

// --- Atomic Transfers ---

export function transfer(fromAgentId: string, toAgentId: string, amount: number, type: string, metadata?: string): {
  success: boolean; transactionId?: string; error?: string;
} {
  if (amount <= 0) return { success: false, error: "Amount must be positive" };

  const txn = db.transaction(() => {
    ensureWallet(fromAgentId);
    ensureWallet(toAgentId);

    const from = getWallet(fromAgentId)!;
    if (from.balance < amount) {
      throw new Error("Insufficient balance");
    }

    db.prepare("UPDATE wallets SET balance = balance - ? WHERE agent_id = ?").run(amount, fromAgentId);
    db.prepare("UPDATE wallets SET balance = balance + ? WHERE agent_id = ?").run(amount, toAgentId);

    const txId = "tx_" + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO transactions (id, from_agent_id, to_agent_id, amount, type, status, metadata)
      VALUES (?, ?, ?, ?, ?, 'completed', ?)
    `).run(txId, fromAgentId, toAgentId, amount, type, metadata ?? null);

    return txId;
  });

  try {
    const txId = txn();
    return { success: true, transactionId: txId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Transfer failed" };
  }
}

export function reward(agentId: string, amount: number, reason: string) {
  ensureWallet(agentId);
  const txId = "tx_" + uuidv4().slice(0, 8);
  db.prepare("UPDATE wallets SET balance = balance + ? WHERE agent_id = ?").run(amount, agentId);
  db.prepare(`
    INSERT INTO transactions (id, to_agent_id, amount, type, status, metadata)
    VALUES (?, ?, ?, 'reward', 'completed', ?)
  `).run(txId, agentId, amount, reason);
  return txId;
}

export function getTransactionHistory(agentId: string, limit = 50) {
  return db.prepare(`
    SELECT * FROM transactions
    WHERE from_agent_id = ? OR to_agent_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(agentId, agentId, limit);
}

// --- Escrow ---

export function createEscrow(fromAgentId: string, amount: number, conditions?: string) {
  if (amount <= 0) return { success: false as const, error: "Amount must be positive" };

  const wallet = ensureWallet(fromAgentId);
  if (wallet.balance < amount) return { success: false as const, error: "Insufficient balance" };

  const txId = "tx_" + uuidv4().slice(0, 8);
  const escrowId = "esc_" + uuidv4().slice(0, 8);

  const txn = db.transaction(() => {
    db.prepare("UPDATE wallets SET balance = balance - ? WHERE agent_id = ?").run(amount, fromAgentId);
    db.prepare(`
      INSERT INTO transactions (id, from_agent_id, amount, type, status, metadata)
      VALUES (?, ?, ?, 'escrow', 'held', ?)
    `).run(txId, fromAgentId, amount, conditions ?? null);
    db.prepare(`
      INSERT INTO escrow (id, transaction_id, holder_agent_id, amount, conditions)
      VALUES (?, ?, ?, ?, ?)
    `).run(escrowId, txId, fromAgentId, amount, conditions ?? null);
  });

  txn();
  return { success: true as const, escrowId, transactionId: txId };
}

export function releaseEscrow(escrowId: string, toAgentId: string) {
  const escrow = db.prepare("SELECT * FROM escrow WHERE id = ? AND status = 'held'").get(escrowId) as {
    id: string; amount: number; transaction_id: string;
  } | undefined;

  if (!escrow) return { success: false, error: "Escrow not found or already released" };

  const txn = db.transaction(() => {
    ensureWallet(toAgentId);
    db.prepare("UPDATE wallets SET balance = balance + ? WHERE agent_id = ?").run(escrow.amount, toAgentId);
    db.prepare("UPDATE escrow SET status = 'released', released_at = unixepoch() WHERE id = ?").run(escrowId);
    db.prepare("UPDATE transactions SET status = 'completed', to_agent_id = ? WHERE id = ?").run(toAgentId, escrow.transaction_id);
  });

  txn();
  return { success: true };
}

// --- Staking ---

export function createStake(agentId: string, amount: number, durationDays = 30) {
  const wallet = ensureWallet(agentId);
  if (wallet.balance < amount) return { success: false as const, error: "Insufficient balance" };

  const id = "stake_" + uuidv4().slice(0, 8);
  const unlockTime = Math.floor(Date.now() / 1000) + durationDays * 86400;

  const txn = db.transaction(() => {
    db.prepare("UPDATE wallets SET balance = balance - ? WHERE agent_id = ?").run(amount, agentId);
    db.prepare(`
      INSERT INTO staking (id, agent_id, amount, unlocks_at) VALUES (?, ?, ?, ?)
    `).run(id, agentId, amount, unlockTime);
  });

  txn();
  return { success: true as const, stakeId: id, unlocksAt: unlockTime };
}

export function getStakes(agentId: string) {
  return db.prepare("SELECT * FROM staking WHERE agent_id = ? ORDER BY staked_at DESC").all(agentId);
}

export function unstake(stakeId: string) {
  const stake = db.prepare("SELECT * FROM staking WHERE id = ? AND status = 'active'").get(stakeId) as {
    id: string; agent_id: string; amount: number;
    reward_rate: number; staked_at: number; unlocks_at: number;
  } | undefined;
  if (!stake) return { success: false, error: "Stake not found" };

  const now = Math.floor(Date.now() / 1000);
  if (now < stake.unlocks_at) return { success: false, error: "Stake still locked" };

  const elapsed = (now - stake.staked_at) / (365 * 86400);
  const rewardAmount = stake.amount * stake.reward_rate * elapsed;

  const txn = db.transaction(() => {
    db.prepare("UPDATE wallets SET balance = balance + ? WHERE agent_id = ?").run(stake.amount + rewardAmount, stake.agent_id);
    db.prepare("UPDATE staking SET status = 'completed' WHERE id = ?").run(stakeId);
    reward(stake.agent_id, rewardAmount, `Staking reward for ${stakeId}`);
  });

  txn();
  return { success: true, principal: stake.amount, reward: rewardAmount };
}

// --- Service Listings ---

export function createListing(listing: {
  agentId: string; title: string; description?: string;
  category: string; price: number;
}) {
  const id = "svc_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO service_listings (id, agent_id, title, description, category, price)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, listing.agentId, listing.title, listing.description ?? null, listing.category, listing.price);
  return id;
}

export function getListings(category?: string, limit = 50) {
  if (category) {
    return db.prepare(
      "SELECT l.*, a.name as agent_name FROM service_listings l JOIN agents a ON l.agent_id = a.id WHERE l.category = ? AND l.status = 'active' ORDER BY l.rating DESC LIMIT ?"
    ).all(category, limit);
  }
  return db.prepare(
    "SELECT l.*, a.name as agent_name FROM service_listings l JOIN agents a ON l.agent_id = a.id WHERE l.status = 'active' ORDER BY l.rating DESC LIMIT ?"
  ).all(limit);
}

export function createOrder(buyerId: string, listingId: string) {
  const listing = db.prepare("SELECT * FROM service_listings WHERE id = ? AND status = 'active'").get(listingId) as {
    id: string; agent_id: string; price: number;
  } | undefined;
  if (!listing) return { success: false as const, error: "Listing not found" };

  const escrowResult = createEscrow(buyerId, listing.price, `Order for ${listingId}`);
  if (!escrowResult.success) return { success: false as const, error: escrowResult.error };

  const orderId = "ord_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO service_orders (id, listing_id, buyer_id, seller_id, escrow_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(orderId, listingId, buyerId, listing.agent_id, escrowResult.escrowId);

  return { success: true as const, orderId, escrowId: escrowResult.escrowId };
}

export function completeOrder(orderId: string, rating?: number, review?: string) {
  const order = db.prepare("SELECT * FROM service_orders WHERE id = ? AND status = 'requested'").get(orderId) as {
    id: string; escrow_id: string; seller_id: string; listing_id: string;
  } | undefined;
  if (!order) return { success: false, error: "Order not found" };

  const commission = 0.05;
  const escrow = db.prepare("SELECT amount FROM escrow WHERE id = ?").get(order.escrow_id) as { amount: number };
  const sellerAmount = escrow.amount * (1 - commission);

  const txn = db.transaction(() => {
    releaseEscrow(order.escrow_id, order.seller_id);
    // Deduct commission from seller
    db.prepare("UPDATE wallets SET balance = balance - ? WHERE agent_id = ?").run(escrow.amount * commission, order.seller_id);
    db.prepare(`
      UPDATE service_orders SET status = 'completed', completed_at = unixepoch(), rating = ?, review = ? WHERE id = ?
    `).run(rating ?? null, review ?? null, orderId);

    if (rating) {
      db.prepare(`
        UPDATE service_listings SET
          rating = (rating * rating_count + ?) / (rating_count + 1),
          rating_count = rating_count + 1
        WHERE id = ?
      `).run(rating, order.listing_id);
    }
  });

  txn();
  return { success: true, sellerReceived: sellerAmount };
}
