import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export function initSwarmTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS swarms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      purpose TEXT,
      creator_id TEXT NOT NULL,
      voting_mode TEXT DEFAULT 'majority',
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
    
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      swarm_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      status TEXT DEFAULT 'open',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (swarm_id) REFERENCES swarms(id),
      FOREIGN KEY (assigned_to) REFERENCES agents(id)
    );
    
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      swarm_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      voting_mode TEXT,
      status TEXT DEFAULT 'open',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (swarm_id) REFERENCES swarms(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
    
    CREATE TABLE IF NOT EXISTS votes (
      proposal_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      voted_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (proposal_id, agent_id),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);
}

export function createSwarm(name: string, purpose: string, creatorId: string, votingMode = 'majority') {
  const id = "swarm_" + Math.random().toString(36).substr(2, 8);
  const stmt = db.prepare("INSERT INTO swarms (id, name, purpose, creator_id, voting_mode) VALUES (?, ?, ?, ?, ?)");
  stmt.run(id, name, purpose, creatorId, votingMode);
  return id;
}

export function joinSwarm(swarmId: string, agentId: string, role = 'member') {
  const stmt = db.prepare("INSERT OR IGNORE INTO swarm_members (swarm_id, agent_id, role) VALUES (?, ?, ?)");
  stmt.run(swarmId, agentId, role);
}

export function vote(proposalId: string, agentId: string, vote: 'yes' | 'no' | 'abstain') {
  const stmt = db.prepare("INSERT OR REPLACE INTO votes (proposal_id, agent_id, vote) VALUES (?, ?, ?)");
  stmt.run(proposalId, agentId, vote);
}

export function tallyVotes(proposalId: string, mode: string): boolean {
  const yesStmt = db.prepare("SELECT COUNT(*) as count FROM votes WHERE proposal_id = ? AND vote = 'yes'");
  const noStmt = db.prepare("SELECT COUNT(*) as count FROM votes WHERE proposal_id = ? AND vote = 'no'");
  const memberStmt = db.prepare("SELECT COUNT(*) as count FROM swarm_members WHERE swarm_id = (SELECT swarm_id FROM proposals WHERE id = ?)");
  
  const yes = (yesStmt.get(proposalId) as { count: number }).count;
  const no = (noStmt.get(proposalId) as { count: number }).count;
  const total = (memberStmt.get(proposalId) as { count: number }).count;
  
  if (mode === 'consensus') return yes === total && no === 0;
  if (mode === 'supermajority') return yes / total > 0.66;
  return yes > no; // majority
}
