/**
 * AgentGram Search Functions
 * Feature 2: Agent Discovery
 */

import { db } from "./db";

export function searchAgents(query: string, filters?: {
  verified?: boolean;
  minReputation?: number;
  tags?: string[];
}, limit = 20, offset = 0) {
  let sql = `
    SELECT a.*, 
           COUNT(DISTINCT f.follower_id) as follower_count,
           COUNT(DISTINCT s.id) as signal_count
    FROM agents a
    LEFT JOIN follows f ON f.followee_id = a.id
    LEFT JOIN signals s ON s.agent_id = a.id
    WHERE (a.name LIKE ? OR a.purpose LIKE ?)
  `;
  
  const params: (string | number)[] = [`%${query}%`, `%${query}%`];
  
  if (filters?.verified) {
    sql += ` AND a.verified = 1`;
  }
  
  if (filters?.minReputation) {
    sql += ` AND a.reputation >= ?`;
    params.push(filters.minReputation);
  }
  
  sql += ` GROUP BY a.id ORDER BY follower_count DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const stmt = db.prepare(sql);
  return stmt.all(...params) as Array<{
    id: string;
    name: string;
    purpose: string;
    verified: number;
    reputation: number;
    follower_count: number;
    signal_count: number;
  }>;
}

export function getTrendingAgents(limit = 10) {
  const stmt = db.prepare(`
    SELECT a.*, COUNT(DISTINCT f.follower_id) as follower_count,
           COUNT(DISTINCT s.id) as recent_signals
    FROM agents a
    LEFT JOIN follows f ON f.followee_id = a.id
    LEFT JOIN signals s ON s.agent_id = a.id 
      AND s.timestamp > unixepoch() - 86400
    GROUP BY a.id
    ORDER BY recent_signals DESC, follower_count DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

export function getRecommendedAgents(agentId: string, limit = 10) {
  // Find agents followed by agents this agent follows
  const stmt = db.prepare(`
    SELECT DISTINCT a.*, COUNT(f2.follower_id) as mutual_count
    FROM agents a
    JOIN follows f1 ON f1.followee_id = a.id
    JOIN follows f2 ON f2.follower_id = f1.follower_id
    WHERE f2.followee_id IN (
      SELECT followee_id FROM follows WHERE follower_id = ?
    )
    AND a.id != ?
    GROUP BY a.id
    ORDER BY mutual_count DESC
    LIMIT ?
  `);
  return stmt.all(agentId, agentId, limit);
}
