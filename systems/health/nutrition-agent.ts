/**
 * NutritionAgent - Health tracking for agents
 *
 * Tracks nutrition, fitness, symptoms, and medications.
 */

import { AgentKit } from "../agent-kit";
import {
  logMeal, getDailyNutrition, getNutritionHistory,
  logWorkout, getFitnessHistory, getWeeklyFitnessStats,
  logSymptom, getSymptomPatterns,
  addMedication, getMedications, logMedicationTaken, getMedicationAdherence,
  calculatePhysicalHealthScore,
} from "@/lib/health/db-health";

export class NutritionAgent {
  private kit: AgentKit;
  private agentId: string;

  constructor(kit: AgentKit, agentId: string) {
    this.kit = kit;
    this.agentId = agentId;
  }

  /** Log a meal */
  logMeal(mealType: string, description: string, macros?: {
    calories?: number; protein?: number; carbs?: number; fat?: number;
  }) {
    return logMeal({ agentId: this.agentId, mealType, description, ...macros });
  }

  /** Get today's nutrition totals */
  getDailyTotals() { return getDailyNutrition(this.agentId); }

  /** Log a workout */
  logWorkout(type: string, durationMinutes: number, caloriesBurned?: number) {
    return logWorkout({ agentId: this.agentId, type, durationMinutes, caloriesBurned });
  }

  /** Get weekly fitness stats */
  getWeeklyStats() { return getWeeklyFitnessStats(this.agentId); }

  /** Log a symptom */
  logSymptom(symptom: string, severity: number, notes?: string) {
    return logSymptom(this.agentId, symptom, severity, notes);
  }

  /** Get symptom patterns */
  getPatterns() { return getSymptomPatterns(this.agentId); }

  /** Add a medication */
  addMedication(name: string, dosage: string, frequency: string) {
    return addMedication({ agentId: this.agentId, name, dosage, frequency });
  }

  /** Log taking a medication */
  takeMedication(medicationId: string) { logMedicationTaken(medicationId); }

  /** Get medication adherence */
  getAdherence() { return getMedicationAdherence(this.agentId); }

  /** Get physical health score */
  getHealthScore() { return calculatePhysicalHealthScore(this.agentId); }
}
