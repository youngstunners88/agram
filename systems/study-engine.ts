/**
 * StudyEngine - Self-improvement between tasks
 *
 * Agents study feedback patterns, research topics,
 * and run simulated scenarios to improve performance.
 */

import { recall, remember, setPreference } from "@/lib/ai/memory";
import { recordEvent, getSkillLevels, getSuccessRate, improveSkill } from "@/lib/ai/learning";
import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

type StudyResult = {
  feedbackInsights: string[];
  newKnowledge: string[];
  skillImprovements: Array<{ skill: string; xpGained: number }>;
};

export class StudyEngine {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  /** Conduct a full study session */
  async conductStudySession(): Promise<StudyResult> {
    const feedback = this.analyzeFeedback();
    const knowledge = this.identifyKnowledgeGaps();
    const improvements = this.practiceWeakSkills();

    // Store session as memory
    remember(this.agentId, "study_session", JSON.stringify({
      feedback: feedback.length, knowledge: knowledge.length,
      improvements: improvements.length, timestamp: Date.now(),
    }), 0.7);

    return {
      feedbackInsights: feedback,
      newKnowledge: knowledge,
      skillImprovements: improvements,
    };
  }

  /** Analyze past feedback to find patterns */
  private analyzeFeedback(): string[] {
    const insights: string[] = [];

    // Look at recent learning events
    const events = db.prepare(`
      SELECT event_type, outcome, COUNT(*) as count
      FROM learning_events WHERE agent_id = ?
      AND created_at > ? GROUP BY event_type, outcome
    `).all(this.agentId, Math.floor(Date.now() / 1000) - 7 * 86400) as Array<{
      event_type: string; outcome: string; count: number;
    }>;

    for (const evt of events) {
      if (evt.outcome === "failure" && evt.count >= 3) {
        insights.push(`Recurring failures in ${evt.event_type} (${evt.count} times) - needs focused practice`);
      }
      if (evt.outcome === "success" && evt.count >= 5) {
        insights.push(`Strong performance in ${evt.event_type} (${evt.count} successes) - consider teaching others`);
      }
    }

    return insights;
  }

  /** Identify areas where knowledge is lacking */
  private identifyKnowledgeGaps(): string[] {
    const gaps: string[] = [];
    const skills = getSkillLevels(this.agentId);

    // Find skills with low levels
    for (const skill of skills) {
      if (skill.level < 2.0) {
        gaps.push(`Skill "${skill.skill}" is at level ${skill.level} - needs improvement`);
      }
    }

    // Check for skills where success rate is low
    const commonSkills = ["financial", "wellness", "health", "communication", "analysis"];
    for (const skill of commonSkills) {
      const rate = getSuccessRate(this.agentId, skill);
      if (rate.total >= 5 && rate.rate < 0.5) {
        gaps.push(`Low success rate in ${skill}: ${Math.round(rate.rate * 100)}%`);
      }
    }

    return gaps;
  }

  /** Practice weak skills to improve */
  private practiceWeakSkills(): Array<{ skill: string; xpGained: number }> {
    const improvements: Array<{ skill: string; xpGained: number }> = [];
    const skills = getSkillLevels(this.agentId);

    // Sort by level ascending to practice weakest first
    const weakSkills = skills.filter(s => s.level < 3.0).sort((a, b) => a.level - b.level);

    for (const skill of weakSkills.slice(0, 3)) {
      // Simulate practice - grant XP based on effort
      const xp = 5;
      improveSkill(this.agentId, skill.skill, xp);
      improvements.push({ skill: skill.skill, xpGained: xp });

      // Record as learning event
      recordEvent(this.agentId, skill.skill, "success", "study_practice");
    }

    return improvements;
  }

  /** Get study recommendations */
  getRecommendations(): string[] {
    const recs: string[] = [];
    const skills = getSkillLevels(this.agentId);

    if (skills.length === 0) {
      recs.push("Start by completing tasks to build your skill profile");
      return recs;
    }

    const weakest = skills[skills.length - 1];
    if (weakest) recs.push(`Focus on improving "${weakest.skill}" (level ${weakest.level})`);

    const memories = recall(this.agentId, { type: "study_session", limit: 1 });
    if (memories.length === 0) {
      recs.push("Run your first study session to accelerate learning");
    }

    return recs;
  }
}
