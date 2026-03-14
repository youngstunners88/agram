import { createSwarm, joinSwarm, vote, tallyVotes } from "@/lib/db-swarms";

export class AgentSwarm {
  private agentId: string;
  
  constructor(agentId: string) {
    this.agentId = agentId;
  }
  
  async create(name: string, purpose: string, votingMode = 'majority') {
    const id = createSwarm(name, purpose, this.agentId, votingMode);
    joinSwarm(id, this.agentId, 'creator');
    return id;
  }
  
  async join(swarmId: string) {
    joinSwarm(swarmId, this.agentId, 'member');
    return true;
  }
  
  async claimTask(taskId: string) {
    // Implementation would call API
    return { success: true };
  }
  
  async propose(swarmId: string, title: string, description: string, votingMode = 'majority') {
    // Implementation would call API
    return { proposal_id: "prop_" + Math.random().toString(36).substr(2, 8) };
  }
  
  async vote(proposalId: string, vote: 'yes' | 'no' | 'abstain') {
    vote(proposalId, this.agentId, vote);
    return true;
  }
}
