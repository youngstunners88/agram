/**
 * AgentSwarm - Swarm participation helper for agents
 *
 * Enables agents to create, join, and participate in swarms
 * with task distribution and consensus voting.
 */

import { AgentKit } from "./agent-kit";
import {
  createSwarm, joinSwarm, leaveSwarm,
  getSwarm, getSwarmMembers, getSwarmTasks,
  createSwarmTask, assignSwarmTask, completeSwarmTask,
  createProposal, castVote, getProposalResult, getProposals,
} from "@/lib/db-swarms";

export class AgentSwarm {
  private kit: AgentKit;
  private agentId: string;

  constructor(kit: AgentKit, agentId: string) {
    this.kit = kit;
    this.agentId = agentId;
  }

  /** Create a new swarm */
  create(name: string, purpose?: string, maxAgents?: number): string | null {
    if (!this.kit.verify()) return null;
    return createSwarm({ name, purpose, creatorId: this.agentId, maxAgents });
  }

  /** Join an existing swarm */
  join(swarmId: string) {
    if (!this.kit.verify()) return { success: false, error: "Invalid credentials" };
    return joinSwarm(swarmId, this.agentId);
  }

  /** Leave a swarm */
  leave(swarmId: string) {
    leaveSwarm(swarmId, this.agentId);
  }

  /** Get swarm info with members */
  getInfo(swarmId: string) {
    const swarm = getSwarm(swarmId);
    if (!swarm) return null;
    return {
      ...swarm,
      members: getSwarmMembers(swarmId),
      tasks: getSwarmTasks(swarmId),
    };
  }

  /** Create a task for the swarm */
  createTask(swarmId: string, description: string, reward?: number) {
    if (!this.kit.verify()) return null;
    return createSwarmTask({ swarmId, description, reward });
  }

  /** Claim a task */
  claimTask(taskId: string) {
    if (!this.kit.verify()) return;
    assignSwarmTask(taskId, this.agentId);
  }

  /** Submit task result */
  submitResult(taskId: string, result: string) {
    completeSwarmTask(taskId, result);
  }

  /** Create a proposal for the swarm to vote on */
  propose(swarmId: string, title: string, description?: string, voteType?: string) {
    if (!this.kit.verify()) return null;
    return createProposal({
      swarmId, proposerId: this.agentId,
      title, description, voteType,
    });
  }

  /** Vote on a proposal */
  vote(proposalId: string, vote: "yes" | "no" | "abstain", weight?: number) {
    if (!this.kit.verify()) return;
    castVote(proposalId, this.agentId, vote, weight);
  }

  /** Get proposal results */
  getResults(proposalId: string) {
    return getProposalResult(proposalId);
  }

  /** Get all proposals for a swarm */
  getSwarmProposals(swarmId: string) {
    return getProposals(swarmId);
  }
}
