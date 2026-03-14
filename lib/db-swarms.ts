/**
 * Swarm Database - Multi-agent collaboration tables
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initSwarmTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS swarms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      purpose TEXT,
      creator_id TEXT NOT NULL,
      max_agents INTEGER DEFAULT 10,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (creator_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS swarm_members (
      swarm_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (swarm_id, agent_id),
      FOREIGN KEY (swarm_id) REFERENCES swarms(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS swarm_tasks (
      id TEXT PRIMARY KEY,
      swarm_id TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      assigned_to TEXT,
      reward REAL DEFAULT 0,
      result TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      completed_at INTEGER,
      FOREIGN KEY (swarm_id) REFERENCES swarms(id),
      FOREIGN KEY (assigned_to) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      swarm_id TEXT NOT NULL,
      proposer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      vote_type TEXT DEFAULT 'majority',
      status TEXT DEFAULT 'open',
      expires_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (swarm_id) REFERENCES swarms(id),
      FOREIGN KEY (proposer_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      proposal_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (proposal_id, agent_id),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_swarm_members_agent ON swarm_members(agent_id);
    CREATE INDEX IF NOT EXISTS idx_swarm_tasks_swarm ON swarm_tasks(swarm_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_swarm ON proposals(swarm_id);
    CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
  `);
}

// --- Swarms ---

export function createSwarm(swarm: {
  name: string; purpose?: string; creatorId: string; maxAgents?: number;
}) {
  const id = "swarm_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO swarms (id, name, purpose, creator_id, max_agents)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, swarm.name, swarm.purpose ?? null, swarm.creatorId, swarm.maxAgents ?? 10);

  // Creator auto-joins as leader
  db.prepare(
    "INSERT INTO swarm_members (swarm_id, agent_id, role) VALUES (?, ?, 'leader')"
  ).run(id, swarm.creatorId);

  return id;
}

export function getSwarm(id: string) {
  return db.prepare("SELECT * FROM swarms WHERE id = ?").get(id) as {
    id: string; name: string; purpose: string | null;
    creator_id: string; max_agents: number; status: string; created_at: number;
  } | undefined;
}

export function listSwarms(status = "active") {
  return db.prepare(
    "SELECT s.*, COUNT(sm.agent_id) as member_count FROM swarms s LEFT JOIN swarm_members sm ON s.id = sm.swarm_id WHERE s.status = ? GROUP BY s.id ORDER BY s.created_at DESC"
  ).all(status);
}

export function joinSwarm(swarmId: string, agentId: string): { success: boolean; error?: string } {
  const swarm = getSwarm(swarmId);
  if (!swarm) return { success: false, error: "Swarm not found" };
  if (swarm.status !== "active") return { success: false, error: "Swarm is not active" };

  const memberCount = (db.prepare(
    "SELECT COUNT(*) as count FROM swarm_members WHERE swarm_id = ?"
  ).get(swarmId) as { count: number }).count;

  if (memberCount >= swarm.max_agents) return { success: false, error: "Swarm is full" };

  db.prepare(
    "INSERT OR IGNORE INTO swarm_members (swarm_id, agent_id) VALUES (?, ?)"
  ).run(swarmId, agentId);
  return { success: true };
}

export function leaveSwarm(swarmId: string, agentId: string) {
  db.prepare(
    "DELETE FROM swarm_members WHERE swarm_id = ? AND agent_id = ? AND role != 'leader'"
  ).run(swarmId, agentId);
}

export function getSwarmMembers(swarmId: string) {
  return db.prepare(`
    SELECT a.id, a.name, a.purpose, sm.role, sm.joined_at
    FROM swarm_members sm JOIN agents a ON sm.agent_id = a.id
    WHERE sm.swarm_id = ? ORDER BY sm.joined_at ASC
  `).all(swarmId);
}

// --- Swarm Tasks ---

export function createSwarmTask(task: {
  swarmId: string; description: string; reward?: number;
}) {
  const id = "stask_" + uuidv4().slice(0, 8);
  db.prepare(
    "INSERT INTO swarm_tasks (id, swarm_id, description, reward) VALUES (?, ?, ?, ?)"
  ).run(id, task.swarmId, task.description, task.reward ?? 0);
  return id;
}

export function assignSwarmTask(taskId: string, agentId: string) {
  db.prepare(
    "UPDATE swarm_tasks SET assigned_to = ?, status = 'assigned' WHERE id = ?"
  ).run(agentId, taskId);
}

export function completeSwarmTask(taskId: string, result: string) {
  db.prepare(
    "UPDATE swarm_tasks SET status = 'completed', result = ?, completed_at = unixepoch() WHERE id = ?"
  ).run(result, taskId);
}

export function getSwarmTasks(swarmId: string) {
  return db.prepare(
    "SELECT * FROM swarm_tasks WHERE swarm_id = ? ORDER BY created_at DESC"
  ).all(swarmId);
}

// --- Proposals & Voting ---

export function createProposal(proposal: {
  swarmId: string; proposerId: string; title: string;
  description?: string; voteType?: string; durationHours?: number;
}) {
  const id = "prop_" + uuidv4().slice(0, 8);
  const expiresAt = Math.floor(Date.now() / 1000) + (proposal.durationHours ?? 24) * 3600;
  db.prepare(`
    INSERT INTO proposals (id, swarm_id, proposer_id, title, description, vote_type, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, proposal.swarmId, proposal.proposerId, proposal.title, proposal.description ?? null, proposal.voteType ?? "majority", expiresAt);
  return id;
}

export function castVote(proposalId: string, agentId: string, vote: "yes" | "no" | "abstain", weight = 1.0) {
  db.prepare(
    "INSERT OR REPLACE INTO votes (proposal_id, agent_id, vote, weight) VALUES (?, ?, ?, ?)"
  ).run(proposalId, agentId, vote, weight);
}

export function getProposalResult(proposalId: string) {
  const votes = db.prepare(
    "SELECT vote, SUM(weight) as total FROM votes WHERE proposal_id = ? GROUP BY vote"
  ).all(proposalId) as Array<{ vote: string; total: number }>;

  const result: Record<string, number> = { yes: 0, no: 0, abstain: 0 };
  for (const v of votes) result[v.vote] = v.total;

  const totalVotes = result.yes + result.no;
  const proposal = db.prepare("SELECT vote_type FROM proposals WHERE id = ?").get(proposalId) as { vote_type: string } | undefined;

  let passed = false;
  if (proposal?.vote_type === "supermajority") {
    passed = totalVotes > 0 && result.yes / totalVotes >= 0.67;
  } else if (proposal?.vote_type === "consensus") {
    passed = totalVotes > 0 && result.no === 0;
  } else {
    passed = result.yes > result.no;
  }

  return { yes: result.yes, no: result.no, abstain: result.abstain, passed };
}

export function getProposals(swarmId: string) {
  return db.prepare(
    "SELECT * FROM proposals WHERE swarm_id = ? ORDER BY created_at DESC"
  ).all(swarmId);
}
