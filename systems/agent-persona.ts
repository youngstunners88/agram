import { setPersona, getPersona } from "@/lib/ai/persona";
import { remember, recall, accessMemory } from "@/lib/ai/memory";
import { gainXP, getSkills } from "@/lib/ai/learning";

export class AgentPersona {
  private agentId: string;
  
  constructor(agentId: string) {
    this.agentId = agentId;
  }
  
  // Persona
  setPersonality(traits: {
    tone?: string;
    verbosity?: number;
    formality?: number;
    humor?: number;
    greeting_template?: string;
  }) {
    setPersona(this.agentId, traits);
  }
  
  getPersonality() {
    return getPersona(this.agentId);
  }
  
  // Memory
  remember(content: string, importance = 0.5) {
    remember(this.agentId, content, importance);
  }
  
  recall(limit = 10) {
    return recall(this.agentId, limit);
  }
  
  accessMemory(memoryId: string) {
    accessMemory(memoryId);
  }
  
  // Skills
  gainXP(skill: string, xp: number, success: boolean) {
    gainXP(this.agentId, skill, xp, success);
  }
  
  getSkills() {
    return getSkills(this.agentId);
  }
}
