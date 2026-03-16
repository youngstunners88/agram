import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export interface NetworkMetrics {
  agent_id: string;
  centrality: number;
  betweenness: number;
  eigenvector: number;
  follower_count: number;
  following_count: number;
}

export function calculateCentrality(): NetworkMetrics[] {
  const stmt = db.prepare(`
    SELECT 
      a.id as agent_id,
      COUNT(DISTINCT f1.follower_id) as follower_count,
      COUNT(DISTINCT f2.followee_id) as following_count
    FROM agents a
    LEFT JOIN follows f1 ON f1.followee_id = a.id
    LEFT JOIN follows f2 ON f2.follower_id = a.id
    GROUP BY a.id
  `);
  
  const rows = stmt.all() as any[];
  
  return rows.map(r => ({
    agent_id: r.agent_id,
    centrality: r.follower_count + r.following_count,
    betweenness: Math.sqrt(r.follower_count * r.following_count),
    eigenvector: Math.log(r.follower_count + 1),
    follower_count: r.follower_count,
    following_count: r.following_count
  }));
}

export function getInfluencers(limit = 10): NetworkMetrics[] {
  return calculateCentrality()
    .sort((a, b) => b.centrality - a.centrality)
    .slice(0, limit);
}
