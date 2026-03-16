/**
 * Wellness Database - Mindfulness, habits, sleep, productivity
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initWellnessTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mindfulness_sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      mood_before INTEGER,
      mood_after INTEGER,
      notes TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      frequency TEXT DEFAULT 'daily',
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      total_completions INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      completed_at INTEGER DEFAULT (unixepoch()),
      notes TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits(id)
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      sleep_start INTEGER NOT NULL,
      sleep_end INTEGER NOT NULL,
      quality INTEGER,
      notes TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      task TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      type TEXT DEFAULT 'pomodoro',
      completed INTEGER DEFAULT 1,
      distractions INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_mindfulness_agent ON mindfulness_sessions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_habits_agent ON habits(agent_id);
    CREATE INDEX IF NOT EXISTS idx_habit_comp_habit ON habit_completions(habit_id);
    CREATE INDEX IF NOT EXISTS idx_sleep_agent ON sleep_logs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_focus_agent ON focus_sessions(agent_id);
  `);
}

// --- Mindfulness ---

export function logMindfulness(session: {
  agentId: string; type: string; durationSeconds: number;
  moodBefore?: number; moodAfter?: number; notes?: string;
}) {
  const id = "mind_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO mindfulness_sessions (id, agent_id, type, duration_seconds, mood_before, mood_after, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, session.agentId, session.type, session.durationSeconds,
    session.moodBefore ?? null, session.moodAfter ?? null, session.notes ?? null);
  return id;
}

export function getMindfulnessHistory(agentId: string, limit = 30) {
  return db.prepare("SELECT * FROM mindfulness_sessions WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?").all(agentId, limit);
}

export function getMindfulnessStreak(agentId: string): number {
  const sessions = db.prepare(
    "SELECT DISTINCT date(created_at, 'unixepoch') as day FROM mindfulness_sessions WHERE agent_id = ? ORDER BY day DESC"
  ).all(agentId) as Array<{ day: string }>;

  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < sessions.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    if (sessions[i]?.day === expected || (i === 0 && sessions[i]?.day === today)) {
      streak++;
    } else break;
  }
  return streak;
}

// --- Habits ---

export function createHabit(agentId: string, name: string, description?: string, frequency = "daily") {
  const id = "habit_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO habits (id, agent_id, name, description, frequency) VALUES (?, ?, ?, ?, ?)")
    .run(id, agentId, name, description ?? null, frequency);
  return id;
}

export function completeHabit(habitId: string, notes?: string) {
  const id = "hcomp_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO habit_completions (id, habit_id, notes) VALUES (?, ?, ?)").run(id, habitId, notes ?? null);

  const habit = db.prepare("SELECT * FROM habits WHERE id = ?").get(habitId) as {
    streak: number; best_streak: number;
  } | undefined;
  if (!habit) return;

  const newStreak = habit.streak + 1;
  const bestStreak = Math.max(newStreak, habit.best_streak);
  db.prepare("UPDATE habits SET streak = ?, best_streak = ?, total_completions = total_completions + 1 WHERE id = ?")
    .run(newStreak, bestStreak, habitId);
}

export function getHabits(agentId: string) {
  return db.prepare("SELECT * FROM habits WHERE agent_id = ? AND status = 'active' ORDER BY name").all(agentId);
}

// --- Sleep ---

export function logSleep(agentId: string, sleepStart: number, sleepEnd: number, quality?: number, notes?: string) {
  const id = "sleep_" + uuidv4().slice(0, 8);
  db.prepare("INSERT INTO sleep_logs (id, agent_id, sleep_start, sleep_end, quality, notes) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, agentId, sleepStart, sleepEnd, quality ?? null, notes ?? null);
  return id;
}

export function getSleepHistory(agentId: string, limit = 30) {
  return db.prepare("SELECT * FROM sleep_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?").all(agentId, limit);
}

export function getAvgSleepQuality(agentId: string, days = 7) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const result = db.prepare(
    "SELECT AVG(quality) as avg_quality, AVG(sleep_end - sleep_start) as avg_duration FROM sleep_logs WHERE agent_id = ? AND created_at > ? AND quality IS NOT NULL"
  ).get(agentId, since) as { avg_quality: number | null; avg_duration: number | null };
  return {
    avgQuality: result.avg_quality ? Math.round(result.avg_quality * 10) / 10 : null,
    avgDurationHours: result.avg_duration ? Math.round(result.avg_duration / 360) / 10 : null,
  };
}

// --- Focus Sessions ---

export function logFocus(session: {
  agentId: string; task: string; durationMinutes: number;
  type?: string; completed?: boolean; distractions?: number;
}) {
  const id = "focus_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO focus_sessions (id, agent_id, task, duration_minutes, type, completed, distractions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, session.agentId, session.task, session.durationMinutes,
    session.type ?? "pomodoro", session.completed ? 1 : 0, session.distractions ?? 0);
  return id;
}

export function getFocusHistory(agentId: string, limit = 30) {
  return db.prepare("SELECT * FROM focus_sessions WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?").all(agentId, limit);
}

export function getFocusStats(agentId: string, days = 7) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const result = db.prepare(`
    SELECT COUNT(*) as sessions, SUM(duration_minutes) as total_minutes,
    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
    AVG(distractions) as avg_distractions
    FROM focus_sessions WHERE agent_id = ? AND created_at > ?
  `).get(agentId, since) as {
    sessions: number; total_minutes: number;
    completed: number; avg_distractions: number;
  };
  return {
    sessions: result.sessions,
    totalMinutes: result.total_minutes ?? 0,
    completionRate: result.sessions > 0 ? Math.round((result.completed / result.sessions) * 100) : 0,
    avgDistractions: result.avg_distractions ? Math.round(result.avg_distractions * 10) / 10 : 0,
  };
}

// --- Wellness Score ---

export function calculateWellnessScore(agentId: string): {
  score: number; breakdown: Record<string, number>; insights: string[];
} {
  const insights: string[] = [];

  // Mindfulness (25%)
  const streak = getMindfulnessStreak(agentId);
  const mindScore = Math.round(Math.min(streak / 7, 1) * 25);
  if (streak === 0) insights.push("Start a daily mindfulness practice");

  // Habits (25%)
  const habits = getHabits(agentId) as Array<{ streak: number }>;
  const avgStreak = habits.length > 0 ? habits.reduce((s, h) => s + h.streak, 0) / habits.length : 0;
  const habitScore = Math.round(Math.min(avgStreak / 7, 1) * 25);
  if (habits.length === 0) insights.push("Create at least one daily habit");

  // Sleep (25%)
  const sleep = getAvgSleepQuality(agentId);
  const sleepScore = sleep.avgQuality ? Math.round((sleep.avgQuality / 10) * 25) : 0;
  if (sleep.avgDurationHours && sleep.avgDurationHours < 7) insights.push("Aim for 7-8 hours of sleep");

  // Focus (25%)
  const focus = getFocusStats(agentId);
  const focusScore = Math.round(Math.min(focus.totalMinutes / 300, 1) * 25);
  if (focus.completionRate < 80) insights.push("Try to complete more focus sessions");

  const score = mindScore + habitScore + sleepScore + focusScore;
  return {
    score: Math.min(score, 100),
    breakdown: { mindfulness: mindScore, habits: habitScore, sleep: sleepScore, focus: focusScore },
    insights,
  };
}
