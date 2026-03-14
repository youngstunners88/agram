/**
 * AgentPersona - Personality engine for agents
 *
 * Manages agent identity, communication style,
 * memory, and learning across interactions.
 */

import { AgentKit } from "./agent-kit";
import { getPersona, updatePersona, applyPersona, generateGreeting, getPersonaSummary } from "@/lib/ai/persona";
import { remember, recall, setPreference, getPreference, getAllPreferences, decayMemories } from "@/lib/ai/memory";
import { recordEvent, getSkillLevels, getLearningProfile } from "@/lib/ai/learning";

type PersonaConfig = {
  tone?: "professional" | "casual" | "humorous" | "technical" | "friendly";
  verbosity?: "minimal" | "concise" | "detailed" | "verbose";
  formality?: "formal" | "semiformal" | "informal";
  humorLevel?: number;
  expertiseAreas?: string[];
};

export class AgentPersona {
  private kit: AgentKit;
  private agentId: string;

  constructor(kit: AgentKit, agentId: string) {
    this.kit = kit;
    this.agentId = agentId;
  }

  /** Configure persona settings */
  configure(config: PersonaConfig) {
    if (!this.kit.verify()) return;
    updatePersona(this.agentId, config);
  }

  /** Get current persona */
  getIdentity() {
    return getPersona(this.agentId);
  }

  /** Get persona summary string */
  getSummary() {
    return getPersonaSummary(this.agentId);
  }

  /** Apply persona style to a message */
  styleMessage(message: string): string {
    return applyPersona(this.agentId, message);
  }

  /** Generate a greeting */
  greet(name: string, purpose: string): string {
    return generateGreeting(this.agentId, name, purpose);
  }

  // --- Memory ---

  /** Store a memory */
  remember(type: string, content: string, importance?: number) {
    return remember(this.agentId, type, content, importance);
  }

  /** Recall memories */
  recall(options?: { type?: string; search?: string; limit?: number }) {
    return recall(this.agentId, options);
  }

  /** Set a preference */
  setPreference(key: string, value: string, confidence?: number) {
    setPreference(this.agentId, key, value, confidence);
  }

  /** Get a preference */
  getPreference(key: string) {
    return getPreference(this.agentId, key);
  }

  /** Get all preferences */
  getAllPreferences() {
    return getAllPreferences(this.agentId);
  }

  /** Decay old memories */
  maintainMemory() {
    decayMemories(this.agentId);
  }

  // --- Learning ---

  /** Record a learning event */
  learn(eventType: string, outcome: "success" | "failure" | "neutral", context?: string) {
    return recordEvent(this.agentId, eventType, outcome, context);
  }

  /** Get skill levels */
  getSkills() {
    return getSkillLevels(this.agentId);
  }

  /** Get full learning profile */
  getLearningProfile() {
    return getLearningProfile(this.agentId);
  }
}
