/**
 * Agent Persona - Personality and communication style management
 *
 * Configurable traits, tone, expertise areas, and
 * consistent voice across interactions.
 */

import Database from "better-sqlite3";

const db = new Database("./agentgram.db");

export function initPersonaTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_personas (
      agent_id TEXT PRIMARY KEY,
      tone TEXT DEFAULT 'professional',
      verbosity TEXT DEFAULT 'concise',
      formality TEXT DEFAULT 'formal',
      humor_level REAL DEFAULT 0.2,
      expertise_areas TEXT,
      communication_style TEXT,
      greeting_template TEXT,
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);
}

type Persona = {
  tone: "professional" | "casual" | "humorous" | "technical" | "friendly";
  verbosity: "minimal" | "concise" | "detailed" | "verbose";
  formality: "formal" | "semiformal" | "informal";
  humorLevel: number;
  expertiseAreas: string[];
  communicationStyle: string;
  greetingTemplate: string;
};

const DEFAULT_PERSONA: Persona = {
  tone: "professional",
  verbosity: "concise",
  formality: "formal",
  humorLevel: 0.2,
  expertiseAreas: [],
  communicationStyle: "direct and clear",
  greetingTemplate: "Hello, I'm {name}. {purpose}",
};

/** Get or create persona for an agent */
export function getPersona(agentId: string): Persona {
  const row = db.prepare("SELECT * FROM agent_personas WHERE agent_id = ?").get(agentId) as {
    tone: string; verbosity: string; formality: string;
    humor_level: number; expertise_areas: string | null;
    communication_style: string | null; greeting_template: string | null;
  } | undefined;

  if (!row) return { ...DEFAULT_PERSONA };

  return {
    tone: row.tone as Persona["tone"],
    verbosity: row.verbosity as Persona["verbosity"],
    formality: row.formality as Persona["formality"],
    humorLevel: row.humor_level,
    expertiseAreas: row.expertise_areas ? JSON.parse(row.expertise_areas) : [],
    communicationStyle: row.communication_style ?? DEFAULT_PERSONA.communicationStyle,
    greetingTemplate: row.greeting_template ?? DEFAULT_PERSONA.greetingTemplate,
  };
}

/** Update persona settings */
export function updatePersona(agentId: string, updates: Partial<Persona>) {
  const current = getPersona(agentId);
  const merged = { ...current, ...updates };

  db.prepare(`
    INSERT INTO agent_personas (agent_id, tone, verbosity, formality, humor_level, expertise_areas, communication_style, greeting_template)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      tone = excluded.tone,
      verbosity = excluded.verbosity,
      formality = excluded.formality,
      humor_level = excluded.humor_level,
      expertise_areas = excluded.expertise_areas,
      communication_style = excluded.communication_style,
      greeting_template = excluded.greeting_template,
      updated_at = unixepoch()
  `).run(
    agentId, merged.tone, merged.verbosity, merged.formality,
    merged.humorLevel, JSON.stringify(merged.expertiseAreas),
    merged.communicationStyle, merged.greetingTemplate,
  );
}

/** Apply persona to a message (adjust tone/style) */
export function applyPersona(agentId: string, message: string): string {
  const persona = getPersona(agentId);

  let result = message;

  // Adjust verbosity
  if (persona.verbosity === "minimal" && result.length > 100) {
    const sentences = result.split(/[.!?]+/).filter(Boolean);
    result = sentences.slice(0, 2).join(". ") + ".";
  }

  // Add formality markers
  if (persona.formality === "informal") {
    result = result.replace(/\bplease\b/gi, "");
    result = result.replace(/\bkindly\b/gi, "");
  }

  return result.trim();
}

/** Generate a greeting based on persona */
export function generateGreeting(agentId: string, agentName: string, purpose: string): string {
  const persona = getPersona(agentId);
  return persona.greetingTemplate
    .replace("{name}", agentName)
    .replace("{purpose}", purpose);
}

/** Get persona summary for display */
export function getPersonaSummary(agentId: string): string {
  const p = getPersona(agentId);
  const expertise = p.expertiseAreas.length > 0 ? p.expertiseAreas.join(", ") : "general";
  return `${p.tone} tone, ${p.verbosity} style, ${p.formality} formality, expertise: ${expertise}`;
}
