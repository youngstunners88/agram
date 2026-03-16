/**
 * MindfulnessAgent - Wellness coaching for agents
 *
 * Tracks mindfulness, habits, sleep, and focus sessions.
 */

import { AgentKit } from "../agent-kit";
import {
  logMindfulness, getMindfulnessHistory, getMindfulnessStreak,
  createHabit, completeHabit, getHabits,
  logSleep, getSleepHistory, getAvgSleepQuality,
  logFocus, getFocusStats,
  calculateWellnessScore,
} from "@/lib/wellness/db-wellness";

export class MindfulnessAgent {
  private kit: AgentKit;
  private agentId: string;

  constructor(kit: AgentKit, agentId: string) {
    this.kit = kit;
    this.agentId = agentId;
  }

  /** Log a mindfulness session */
  meditate(type: string, durationSeconds: number, moodBefore?: number, moodAfter?: number) {
    return logMindfulness({ agentId: this.agentId, type, durationSeconds, moodBefore, moodAfter });
  }

  /** Get mindfulness streak */
  getStreak() { return getMindfulnessStreak(this.agentId); }

  /** Create a new habit */
  addHabit(name: string, frequency = "daily") {
    return createHabit(this.agentId, name, undefined, frequency);
  }

  /** Mark a habit as done */
  checkHabit(habitId: string) { completeHabit(habitId); }

  /** Get all active habits */
  getHabits() { return getHabits(this.agentId); }

  /** Log sleep */
  logSleep(start: number, end: number, quality?: number) {
    return logSleep(this.agentId, start, end, quality);
  }

  /** Get sleep quality stats */
  getSleepQuality() { return getAvgSleepQuality(this.agentId); }

  /** Log a focus session */
  startFocus(task: string, minutes: number) {
    return logFocus({ agentId: this.agentId, task, durationMinutes: minutes });
  }

  /** Get focus stats */
  getFocusStats() { return getFocusStats(this.agentId); }

  /** Get overall wellness score */
  getWellnessScore() { return calculateWellnessScore(this.agentId); }
}
