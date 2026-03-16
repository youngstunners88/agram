/**
 * Health Database - Nutrition, fitness, symptoms, medications
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initHealthTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nutrition_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      description TEXT NOT NULL,
      calories INTEGER,
      protein REAL,
      carbs REAL,
      fat REAL,
      logged_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS fitness_workouts (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL,
      calories_burned INTEGER,
      intensity TEXT DEFAULT 'moderate',
      exercises TEXT,
      logged_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS symptom_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      symptom TEXT NOT NULL,
      severity INTEGER NOT NULL,
      notes TEXT,
      triggers TEXT,
      logged_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      time_of_day TEXT,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL,
      taken_at INTEGER DEFAULT (unixepoch()),
      skipped INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (medication_id) REFERENCES medications(id)
    );

    CREATE INDEX IF NOT EXISTS idx_nutrition_agent ON nutrition_logs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_fitness_agent ON fitness_workouts(agent_id);
    CREATE INDEX IF NOT EXISTS idx_symptom_agent ON symptom_logs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_meds_agent ON medications(agent_id);
    CREATE INDEX IF NOT EXISTS idx_med_logs_med ON medication_logs(medication_id);
  `);
}

// --- Nutrition ---

export function logMeal(meal: {
  agentId: string; mealType: string; description: string;
  calories?: number; protein?: number; carbs?: number; fat?: number;
}) {
  const id = "meal_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO nutrition_logs (id, agent_id, meal_type, description, calories, protein, carbs, fat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, meal.agentId, meal.mealType, meal.description,
    meal.calories ?? null, meal.protein ?? null, meal.carbs ?? null, meal.fat ?? null);
  return id;
}

export function getNutritionHistory(agentId: string, days = 7) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return db.prepare("SELECT * FROM nutrition_logs WHERE agent_id = ? AND logged_at > ? ORDER BY logged_at DESC").all(agentId, since);
}

export function getDailyNutrition(agentId: string) {
  const dayStart = Math.floor(Date.now() / 1000) - (Date.now() % 86400000) / 1000;
  return db.prepare(`
    SELECT COALESCE(SUM(calories), 0) as calories, COALESCE(SUM(protein), 0) as protein,
    COALESCE(SUM(carbs), 0) as carbs, COALESCE(SUM(fat), 0) as fat, COUNT(*) as meals
    FROM nutrition_logs WHERE agent_id = ? AND logged_at > ?
  `).get(agentId, dayStart) as {
    calories: number; protein: number; carbs: number; fat: number; meals: number;
  };
}

// --- Fitness ---

export function logWorkout(workout: {
  agentId: string; type: string; description?: string;
  durationMinutes: number; caloriesBurned?: number;
  intensity?: string; exercises?: string;
}) {
  const id = "workout_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO fitness_workouts (id, agent_id, type, description, duration_minutes, calories_burned, intensity, exercises)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, workout.agentId, workout.type, workout.description ?? null,
    workout.durationMinutes, workout.caloriesBurned ?? null,
    workout.intensity ?? "moderate", workout.exercises ?? null);
  return id;
}

export function getFitnessHistory(agentId: string, limit = 30) {
  return db.prepare("SELECT * FROM fitness_workouts WHERE agent_id = ? ORDER BY logged_at DESC LIMIT ?").all(agentId, limit);
}

export function getWeeklyFitnessStats(agentId: string) {
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
  return db.prepare(`
    SELECT COUNT(*) as workouts, COALESCE(SUM(duration_minutes), 0) as total_minutes,
    COALESCE(SUM(calories_burned), 0) as total_calories
    FROM fitness_workouts WHERE agent_id = ? AND logged_at > ?
  `).get(agentId, weekAgo) as { workouts: number; total_minutes: number; total_calories: number };
}

// --- Symptoms ---

export function logSymptom(agentId: string, symptom: string, severity: number, notes?: string, triggers?: string) {
  const id = "sym_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO symptom_logs (id, agent_id, symptom, severity, notes, triggers) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, agentId, symptom, severity, notes ?? null, triggers ?? null);
  return id;
}

export function getSymptomHistory(agentId: string, limit = 50) {
  return db.prepare("SELECT * FROM symptom_logs WHERE agent_id = ? ORDER BY logged_at DESC LIMIT ?").all(agentId, limit);
}

export function getSymptomPatterns(agentId: string) {
  return db.prepare(`
    SELECT symptom, COUNT(*) as occurrences, AVG(severity) as avg_severity,
    MAX(severity) as max_severity
    FROM symptom_logs WHERE agent_id = ? GROUP BY symptom ORDER BY occurrences DESC
  `).all(agentId) as Array<{
    symptom: string; occurrences: number; avg_severity: number; max_severity: number;
  }>;
}

// --- Medications ---

export function addMedication(med: {
  agentId: string; name: string; dosage: string;
  frequency: string; timeOfDay?: string;
}) {
  const id = "med_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO medications (id, agent_id, name, dosage, frequency, time_of_day) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, med.agentId, med.name, med.dosage, med.frequency, med.timeOfDay ?? null);
  return id;
}

export function getMedications(agentId: string) {
  return db.prepare("SELECT * FROM medications WHERE agent_id = ? AND status = 'active' ORDER BY name").all(agentId);
}

export function logMedicationTaken(medicationId: string, skipped = false, notes?: string) {
  const id = "mlog_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO medication_logs (id, medication_id, skipped, notes) VALUES (?, ?, ?, ?)")
    .run(id, medicationId, skipped ? 1 : 0, notes ?? null);
  return id;
}

export function getMedicationAdherence(agentId: string, days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const meds = getMedications(agentId) as Array<{ id: string; name: string }>;
  return meds.map((med) => {
    const logs = db.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN skipped = 0 THEN 1 ELSE 0 END) as taken FROM medication_logs WHERE medication_id = ? AND taken_at > ?"
    ).get(med.id, since) as { total: number; taken: number };
    return {
      medication: med.name,
      total: logs.total,
      taken: logs.taken,
      adherence: logs.total > 0 ? Math.round((logs.taken / logs.total) * 100) : 0,
    };
  });
}

// --- Health Score ---

export function calculatePhysicalHealthScore(agentId: string): {
  score: number; breakdown: Record<string, number>; insights: string[];
} {
  const insights: string[] = [];

  // Nutrition (30%)
  const daily = getDailyNutrition(agentId);
  const nutritionScore = daily.meals > 0 ? Math.round(Math.min(daily.meals / 3, 1) * 30) : 0;
  if (daily.meals < 3) insights.push("Log at least 3 meals per day");

  // Fitness (30%)
  const fitness = getWeeklyFitnessStats(agentId);
  const fitnessScore = Math.round(Math.min(fitness.workouts / 3, 1) * 30);
  if (fitness.workouts < 3) insights.push("Aim for at least 3 workouts per week");

  // Symptom management (20%)
  const patterns = getSymptomPatterns(agentId);
  const avgSeverity = patterns.length > 0
    ? patterns.reduce((s, p) => s + p.avg_severity, 0) / patterns.length : 0;
  const symptomScore = Math.round(Math.max(0, 1 - avgSeverity / 10) * 20);
  if (avgSeverity > 5) insights.push("High average symptom severity - consider consulting a professional");

  // Medication adherence (20%)
  const adherence = getMedicationAdherence(agentId);
  const avgAdherence = adherence.length > 0
    ? adherence.reduce((s, a) => s + a.adherence, 0) / adherence.length : 100;
  const medScore = Math.round((avgAdherence / 100) * 20);
  if (avgAdherence < 80) insights.push("Improve medication adherence");

  const score = nutritionScore + fitnessScore + symptomScore + medScore;
  return {
    score: Math.min(score, 100),
    breakdown: { nutrition: nutritionScore, fitness: fitnessScore, symptoms: symptomScore, medications: medScore },
    insights,
  };
}
