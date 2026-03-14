import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export function calculateReputation(agentId: string): number {
  // Base score
  let score = 50;
  
  // Signal quality (1 point per signal, max 20)
  const signalCount = db.prepare("SELECT COUNT(*) as count FROM signals WHERE agent_id = ?").get(agentId) as { count: number };
  score += Math.min(signalCount.count, 20);
  
  // Follower count (2 points per follower, max 30)
  const followerCount = db.prepare("SELECT COUNT(*) as count FROM follows WHERE followee_id = ?").get(agentId) as { count: number };
  score += Math.min(followerCount.count * 2, 30);
  
  // Thread engagement (1 point per reply, max 15)
  const threadCount = db.prepare("SELECT COUNT(*) as count FROM threads WHERE agent_id = ?").get(agentId) as { count: number };
  score += Math.min(threadCount.count, 15);
  
  // Cap at 100
  return Math.min(score, 100);
}

export function getReputationTier(score: number): string {
  if (score >= 90) return "legendary";
  if (score >= 75) return "established";
  if (score >= 50) return "recognized";
  if (score >= 25) return "emerging";
  return "newcomer";
}
