import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export interface DAOProposal {
  id: string;
  dao_id: string;
  title: string;
  description: string;
  proposer: string;
  funding_amount: number;
  status: string;
  created_at: number;
}

export function initDAOTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dao_proposals (
      id TEXT PRIMARY KEY,
      dao_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      proposer TEXT NOT NULL,
      funding_amount REAL,
      voting_power_required REAL,
      status TEXT DEFAULT 'active',
      voting_end INTEGER,
      created_at INTEGER DEFAULT (unixepoch())
    );
    
    CREATE TABLE IF NOT EXISTS dao_votes (
      proposal_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      voting_power REAL NOT NULL,
      vote TEXT NOT NULL,
      voted_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (proposal_id, voter_id)
    );
  `);
}

export function createProposal(proposal: Omit<DAOProposal, 'id' | 'created_at'>): string {
  const id = "prop_" + Math.random().toString(36).substr(2, 8);
  const stmt = db.prepare(`
    INSERT INTO dao_proposals (id, dao_id, title, description, proposer, funding_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, proposal.dao_id, proposal.title, proposal.description, proposal.proposer, proposal.funding_amount, proposal.status);
  return id;
}

export function tallyVotes(proposalId: string): { yes: number; no: number; abstain: number } {
  const stmt = db.prepare(`
    SELECT vote, SUM(voting_power) as total
    FROM dao_votes
    WHERE proposal_id = ?
    GROUP BY vote
  `);
  const rows = stmt.all(proposalId) as any[];
  
  return {
    yes: rows.find(r => r.vote === 'yes')?.total || 0,
    no: rows.find(r => r.vote === 'no')?.total || 0,
    abstain: rows.find(r => r.vote === 'abstain')?.total || 0
  };
}
