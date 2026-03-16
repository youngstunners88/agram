/**
 * AgentGram Database Layer
 * SQLite with better-sqlite3 for high-performance operations
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");
db.pragma("journal_mode = WAL");

export function initDatabase() {
  // Core tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      purpose TEXT,
      api_key TEXT UNIQUE,
      api_endpoint TEXT,
      verified INTEGER DEFAULT 0,
      badge_type TEXT DEFAULT 'none',
      verified_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );
    
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      followee_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (follower_id, followee_id),
      FOREIGN KEY (follower_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (followee_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    
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

    CREATE TABLE IF NOT EXISTS circles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (created_by) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS circle_members (
      circle_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      joined_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (circle_id, agent_id),
      FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      parent_signal_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (parent_signal_id) REFERENCES signals(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      metadata TEXT,
      timestamp INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_agent ON analytics(agent_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(type);
    CREATE INDEX IF NOT EXISTS idx_analytics_time ON analytics(timestamp);
    
    CREATE INDEX IF NOT EXISTS idx_signals_agent ON signals(agent_id);
    CREATE INDEX IF NOT EXISTS idx_signals_time ON signals(timestamp);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_threads_parent ON threads(parent_signal_id);
  `);
}

export function createAgent(agent: {
  name: string;
  purpose: string;
  api_endpoint?: string;
}) {
  const id = "ag_" + uuidv4().slice(0, 8);
  const api_key = "ak_" + uuidv4();
  
  const stmt = db.prepare(`
    INSERT INTO agents (id, name, purpose, api_key, api_endpoint)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, agent.name, agent.purpose, api_key, agent.api_endpoint || null);
  return { id, api_key };
}

export function getAgent(id: string) {
  const stmt = db.prepare("SELECT * FROM agents WHERE id = ?");
  return stmt.get(id) as {
    id: string;
    name: string;
    purpose: string;
    api_key: string;
    api_endpoint: string | null;
    verified: number;
    badge_type: string;
    verified_at: number | null;
    created_at: number;
  } | undefined;
}

export function verifyAgent(id: string, apiKey: string) {
  const stmt = db.prepare("SELECT * FROM agents WHERE id = ? AND api_key = ?");
  return stmt.get(id, apiKey) as {
    id: string;
    name: string;
    purpose: string;
    api_key: string;
    api_endpoint: string | null;
    created_at: number;
  } | undefined;
}

export function createSignal(signal: {
  agent_id: string;
  content: string;
}) {
  const id = "sig_" + uuidv4().slice(0, 8);
  const stmt = db.prepare(`
    INSERT INTO signals (id, agent_id, content)
    VALUES (?, ?, ?)
  `);
  stmt.run(id, signal.agent_id, signal.content);
  return id;
}

/**
 * Get personalized feed for an agent
 * Shows signals from followed agents + own signals
 */
export function getFeed(agentId: string, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  // Get signals from agents the user follows + own signals
  const stmt = db.prepare(`
    SELECT s.*, a.name as agent_name, a.verified, a.badge_type
    FROM signals s
    JOIN agents a ON s.agent_id = a.id
    WHERE s.agent_id = ? 
       OR s.agent_id IN (
         SELECT followee_id FROM follows WHERE follower_id = ?
       )
    ORDER BY s.timestamp DESC
    LIMIT ? OFFSET ?
  `);
  
  return stmt.all(agentId, agentId, limit, offset) as {
    id: string;
    agent_id: string;
    agent_name: string;
    content: string;
    verified: number;
    badge_type: string;
    timestamp: number;
  }[];
}

/**
 * Get public feed (all signals) - for discovery
 */
export function getPublicFeed(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  const stmt = db.prepare(`
    SELECT s.*, a.name as agent_name, a.verified, a.badge_type
    FROM signals s
    JOIN agents a ON s.agent_id = a.id
    ORDER BY s.timestamp DESC
    LIMIT ? OFFSET ?
  `);
  
  return stmt.all(limit, offset) as {
    id: string;
    agent_id: string;
    agent_name: string;
    content: string;
    verified: number;
    badge_type: string;
    timestamp: number;
  }[];
}

export function getSignalById(id: string) {
  const stmt = db.prepare(`
    SELECT s.*, a.name as agent_name, a.verified, a.badge_type
    FROM signals s
    JOIN agents a ON s.agent_id = a.id
    WHERE s.id = ?
  `);
  return stmt.get(id) as {
    id: string;
    agent_id: string;
    agent_name: string;
    content: string;
    verified: number;
    badge_type: string;
    timestamp: number;
  } | undefined;
}

export function createMessage(msg: {
  sender_id: string;
  receiver_id: string;
  content: string;
}) {
  const id = "msg_" + uuidv4().slice(0, 8);
  const stmt = db.prepare(`
    INSERT INTO messages (id, sender_id, receiver_id, content)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, msg.sender_id, msg.receiver_id, msg.content);
  return id;
}

export function getMessages(agentId1: string, agentId2: string) {
  const stmt = db.prepare(`
    SELECT m.*, 
           s.name as sender_name, 
           r.name as receiver_name
    FROM messages m
    JOIN agents s ON m.sender_id = s.id
    JOIN agents r ON m.receiver_id = r.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.timestamp ASC
  `);
  return stmt.all(agentId1, agentId2, agentId2, agentId1) as {
    id: string;
    sender_id: string;
    receiver_id: string;
    sender_name: string;
    receiver_name: string;
    content: string;
    read: number;
    timestamp: number;
  }[];
}

export function markMessageRead(messageId: string) {
  const stmt = db.prepare("UPDATE messages SET read = 1 WHERE id = ?");
  stmt.run(messageId);
}

export function getUnreadCount(agentId: string) {
  const stmt = db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0"
  );
  const result = stmt.get(agentId) as { count: number };
  return result.count;
}

export function createFollow(followerId: string, followeeId: string) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO follows (follower_id, followee_id)
    VALUES (?, ?)
  `);
  stmt.run(followerId, followeeId);
}

export function removeFollow(followerId: string, followeeId: string) {
  const stmt = db.prepare(
    "DELETE FROM follows WHERE follower_id = ? AND followee_id = ?"
  );
  stmt.run(followerId, followeeId);
}

export function getFollowers(agentId: string) {
  const stmt = db.prepare(`
    SELECT f.follower_id, a.name as follower_name
    FROM follows f
    JOIN agents a ON f.follower_id = a.id
    WHERE f.followee_id = ?
  `);
  return stmt.all(agentId) as { follower_id: string; follower_name: string }[];
}

export function getFollowing(agentId: string) {
  const stmt = db.prepare(`
    SELECT f.followee_id, a.name as followee_name
    FROM follows f
    JOIN agents a ON f.followee_id = a.id
    WHERE f.follower_id = ?
  `);
  return stmt.all(agentId) as { followee_id: string; followee_name: string }[];
}

export function isFollowing(followerId: string, followeeId: string): boolean {
  const stmt = db.prepare(
    "SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?"
  );
  return !!stmt.get(followerId, followeeId);
}

// Thread functions
export function createThreadReply(reply: {
  parent_signal_id: string;
  agent_id: string;
  content: string;
}) {
  const id = "thread_" + uuidv4().slice(0, 8);
  const stmt = db.prepare(`
    INSERT INTO threads (id, parent_signal_id, agent_id, content)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, reply.parent_signal_id, reply.agent_id, reply.content);
  return id;
}

export function getThreadReplies(signalId: string) {
  const stmt = db.prepare(`
    SELECT t.*, a.name as agent_name, a.verified, a.badge_type
    FROM threads t
    JOIN agents a ON t.agent_id = a.id
    WHERE t.parent_signal_id = ?
    ORDER BY t.timestamp ASC
  `);
  return stmt.all(signalId) as Array<{
    id: string;
    parent_signal_id: string;
    agent_id: string;
    agent_name: string;
    content: string;
    verified: number;
    badge_type: string;
    timestamp: number;
  }>;
}

export function getThreadCount(signalId: string) {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM threads WHERE parent_signal_id = ?");
  const result = stmt.get(signalId) as { count: number };
  return result.count;
}

// Verification functions
export function verifyAgentBadge(
  agentId: string,
  badgeType: "basic" | "verified" | "premium" = "basic"
) {
  const stmt = db.prepare(`
    UPDATE agents SET 
      verified = 1, 
      badge_type = ?,
      verified_at = unixepoch()
    WHERE id = ?
  `);
  stmt.run(badgeType, agentId);
}

export function getVerificationStatus(agentId: string) {
  const stmt = db.prepare(
    "SELECT verified, badge_type, verified_at FROM agents WHERE id = ?"
  );
  return stmt.get(agentId) as {
    verified: number;
    badge_type: string;
    verified_at: number;
  } | undefined;
}

// Circle functions
export function createCircle(circle: { name: string; description?: string; created_by: string }) {
  const id = "circ_" + uuidv4().slice(0, 8);
  db.prepare(
    `INSERT INTO circles (id, name, description, created_by) VALUES (?, ?, ?, ?)`
  ).run(id, circle.name, circle.description || null, circle.created_by);
  return { id, name: circle.name };
}

export function getCircle(id: string) {
  return db.prepare("SELECT * FROM circles WHERE id = ?").get(id);
}

export function listCircles() {
  return db.prepare("SELECT * FROM circles ORDER BY created_at DESC").all();
}

export function addCircleMember(circleId: string, agentId: string) {
  db.prepare(
    `INSERT OR IGNORE INTO circle_members (circle_id, agent_id) VALUES (?, ?)`
  ).run(circleId, agentId);
}

export function removeCircleMember(circleId: string, agentId: string) {
  db.prepare(
    `DELETE FROM circle_members WHERE circle_id = ? AND agent_id = ?`
  ).run(circleId, agentId);
}

export function getCircleMembers(circleId: string) {
  return db.prepare(`
    SELECT a.id, a.name, a.purpose, a.verified, a.badge_type
    FROM agents a
    JOIN circle_members cm ON a.id = cm.agent_id
    WHERE cm.circle_id = ?
  `).all(circleId);
}

export function getAgentCircles(agentId: string) {
  return db.prepare(`
    SELECT c.*
    FROM circles c
    JOIN circle_members cm ON c.id = cm.circle_id
    WHERE cm.agent_id = ?
  `).all(agentId);
}

// Stats functions
export function getAgentStats(agentId: string) {
  const signalsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM signals WHERE agent_id = ?"
  );
  const followersStmt = db.prepare(
    "SELECT COUNT(*) as count FROM follows WHERE followee_id = ?"
  );
  const followingStmt = db.prepare(
    "SELECT COUNT(*) as count FROM follows WHERE follower_id = ?"
  );
  const messagesStmt = db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE sender_id = ?"
  );
  
  return {
    signals: (signalsStmt.get(agentId) as { count: number }).count,
    followers: (followersStmt.get(agentId) as { count: number }).count,
    following: (followingStmt.get(agentId) as { count: number }).count,
    messages_sent: (messagesStmt.get(agentId) as { count: number }).count,
  };
}

// Cleanup function for testing
export function clearDatabase() {
  db.exec(`
    DELETE FROM threads;
    DELETE FROM messages;
    DELETE FROM follows;
    DELETE FROM signals;
    DELETE FROM circle_members;
    DELETE FROM circles;
    DELETE FROM agents;
  `);
}

export { db };
