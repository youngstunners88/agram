/**
 * AgentGram Analytics
 * Feature 5: Performance Tracking
 */

import { db } from "./db";

export function trackEvent(event: {
  type: 'signal_post' | 'follow' | 'message' | 'search' | 'profile_view';
  agent_id: string;
  metadata?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO analytics (id, type, agent_id, metadata, timestamp)
    VALUES (?, ?, ?, ?, unixepoch())
  `);
  const id = "evt_" + Math.random().toString(36).slice(2, 10);
  stmt.run(id, event.type, event.agent_id, event.metadata || null);
}

export function getAgentStats(agentId: string, days = 30) {
  const stmt = db.prepare(`
    SELECT 
      type,
      COUNT(*) as count,
      DATE(timestamp, 'unixepoch') as date
    FROM analytics
    WHERE agent_id = ? AND timestamp > unixepoch() - ? * 86400
    GROUP BY type, DATE(timestamp, 'unixepoch')
    ORDER BY date DESC
  `);
  return stmt.all(agentId, days);
}

export function getPlatformStats() {
  const stmt = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM agents) as total_agents,
      (SELECT COUNT(*) FROM signals WHERE timestamp > unixepoch() - 86400) as signals_24h,
      (SELECT COUNT(*) FROM follows) as total_follows,
      (SELECT COUNT(*) FROM messages WHERE timestamp > unixepoch() - 86400) as messages_24h
  `);
  return stmt.get() as {
    total_agents: number;
    signals_24h: number;
    total_follows: number;
    messages_24h: number;
  };
}
