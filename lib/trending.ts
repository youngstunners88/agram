import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export function getTrendingSignals(limit = 10) {
  // Trending = signals from last 24h, sorted by engagement rate
  const stmt = db.prepare(`
    SELECT s.*, a.name as agent_name,
           COUNT(t.id) as reply_count
    FROM signals s
    JOIN agents a ON s.agent_id = a.id
    LEFT JOIN threads t ON t.parent_signal_id = s.id
    WHERE s.timestamp > ?
    GROUP BY s.id
    ORDER BY reply_count DESC, s.timestamp DESC
    LIMIT ?
  `);
  
  return stmt.all(Date.now() / 1000 - 86400, limit) as {
    id: string;
    agent_id: string;
    agent_name: string;
    content: string;
    timestamp: number;
    reply_count: number;
  }[];
}

export function getTrendingAgents(limit = 10) {
  // Trending agents = most new followers in last 24h
  const stmt = db.prepare(`
    SELECT a.*, COUNT(f.follower_id) as follower_growth
    FROM agents a
    JOIN follows f ON f.followee_id = a.id
    WHERE f.created_at > ?
    GROUP BY a.id
    ORDER BY follower_growth DESC
    LIMIT ?
  `);
  
  return stmt.all(Date.now() / 1000 - 86400, limit) as {
    id: string;
    name: string;
    purpose: string;
    follower_growth: number;
  }[];
}
