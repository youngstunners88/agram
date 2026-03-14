/**
 * ML-Powered Recommendation Engine
 *
 * Collaborative filtering + content-based recommendations.
 * No external ML deps — uses SQLite aggregate queries for scoring.
 */

import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

type AgentScore = {
  id: string;
  name: string;
  purpose: string;
  score: number;
  reason: string;
};

/**
 * Recommend agents using collaborative filtering.
 * Finds agents followed by agents you follow (friends-of-friends).
 */
export function collaborativeRecommendations(agentId: string, limit = 10): AgentScore[] {
  const rows = db.prepare(`
    SELECT a.id, a.name, a.purpose, COUNT(*) as mutual_connections
    FROM follows f1
    JOIN follows f2 ON f1.followee_id = f2.follower_id
    JOIN agents a ON f2.followee_id = a.id
    WHERE f1.follower_id = ?
      AND f2.followee_id != ?
      AND f2.followee_id NOT IN (SELECT followee_id FROM follows WHERE follower_id = ?)
    GROUP BY a.id
    ORDER BY mutual_connections DESC
    LIMIT ?
  `).all(agentId, agentId, agentId, limit) as Array<{
    id: string; name: string; purpose: string; mutual_connections: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    purpose: r.purpose,
    score: Math.min(r.mutual_connections * 15, 100),
    reason: `${r.mutual_connections} mutual connection(s)`,
  }));
}

/**
 * Content-based recommendations.
 * Match agents with similar purpose keywords.
 */
export function contentBasedRecommendations(agentId: string, limit = 10): AgentScore[] {
  const agent = db.prepare("SELECT purpose FROM agents WHERE id = ?").get(agentId) as {
    purpose: string;
  } | undefined;
  if (!agent?.purpose) return [];

  // Extract keywords (words 4+ chars)
  const keywords = agent.purpose
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 4);

  if (keywords.length === 0) return [];

  // Build LIKE clauses for each keyword
  const clauses = keywords.map(() => "a.purpose LIKE ?").join(" OR ");
  const params = keywords.map((k) => `%${k}%`);

  const rows = db.prepare(`
    SELECT a.id, a.name, a.purpose
    FROM agents a
    WHERE a.id != ?
      AND a.id NOT IN (SELECT followee_id FROM follows WHERE follower_id = ?)
      AND (${clauses})
    LIMIT ?
  `).all(agentId, agentId, ...params, limit) as Array<{
    id: string; name: string; purpose: string;
  }>;

  return rows.map((r) => {
    const matchCount = keywords.filter((k) => r.purpose.toLowerCase().includes(k)).length;
    return {
      id: r.id,
      name: r.name,
      purpose: r.purpose,
      score: Math.min(Math.round((matchCount / keywords.length) * 100), 100),
      reason: `${matchCount} shared keyword(s) in purpose`,
    };
  });
}

/**
 * Hybrid recommendations: merge collaborative + content-based.
 */
export function getSmartRecommendations(agentId: string, limit = 10): AgentScore[] {
  const collab = collaborativeRecommendations(agentId, limit);
  const content = contentBasedRecommendations(agentId, limit);

  const scoreMap = new Map<string, AgentScore>();

  for (const rec of collab) {
    scoreMap.set(rec.id, { ...rec, score: rec.score * 0.6 });
  }

  for (const rec of content) {
    const existing = scoreMap.get(rec.id);
    if (existing) {
      existing.score += rec.score * 0.4;
      existing.reason += ` + ${rec.reason}`;
    } else {
      scoreMap.set(rec.id, { ...rec, score: rec.score * 0.4 });
    }
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Detect trending topics from recent signals.
 */
export function getTrendingTopics(hours = 24, limit = 10): Array<{ topic: string; count: number }> {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;

  const rows = db.prepare(`
    SELECT content FROM signals WHERE timestamp > ?
  `).all(since) as Array<{ content: string }>;

  const wordCounts = new Map<string, number>();

  for (const row of rows) {
    const words = row.content
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 4);

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(wordCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
