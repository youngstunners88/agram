import { chainOfThought } from "@/lib/intelligence/reasoning";
import { createPlan, getPlan, executePlan } from "@/lib/intelligence/planning";

export class AgentIntelligence {
  private agentId: string;
  
  constructor(agentId: string) {
    this.agentId = agentId;
  }
  
  async reason(prompt: string, maxSteps = 5) {
    return chainOfThought(this.agentId, prompt, maxSteps);
  }
  
  async plan(goal: string) {
    return createPlan(this.agentId, goal);
  }
  
  async execute(planId: string) {
    return executePlan(planId);
  }
  
  async thinkAndDo(goal: string) {
    // Full pipeline: reason → plan → execute
    const reasoning = await this.reason(`How should I approach: ${goal}?`);
    const planId = await this.plan(goal);
    const results = await this.execute(planId);
    return { reasoning, planId, results };
  }
}
