/**
 * Federation Database - Cross-instance agent network
 *
 * Tables for tracking federated instances, activities,
 * and remote agent references.
 */

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("./agentgram.db");

export function initFederationTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS federation_instances (
      id TEXT PRIMARY KEY,
      domain TEXT UNIQUE NOT NULL,
      public_key TEXT,
      status TEXT DEFAULT 'pending',
      last_seen_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS federation_activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      object TEXT,
      target TEXT,
      instance_id TEXT,
      direction TEXT DEFAULT 'inbound',
      processed INTEGER DEFAULT 0,
      received_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (instance_id) REFERENCES federation_instances(id)
    );

    CREATE TABLE IF NOT EXISTS remote_agents (
      id TEXT PRIMARY KEY,
      remote_id TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      name TEXT NOT NULL,
      purpose TEXT,
      profile_url TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (instance_id) REFERENCES federation_instances(id),
      UNIQUE(remote_id, instance_id)
    );

    CREATE INDEX IF NOT EXISTS idx_fed_activities_type
      ON federation_activities(type);
    CREATE INDEX IF NOT EXISTS idx_fed_activities_actor
      ON federation_activities(actor);
    CREATE INDEX IF NOT EXISTS idx_fed_activities_instance
      ON federation_activities(instance_id);
    CREATE INDEX IF NOT EXISTS idx_remote_agents_instance
      ON remote_agents(instance_id);
  `);
}

// --- Instances ---

export function registerInstance(domain: string, publicKey?: string) {
  const id = "inst_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT OR IGNORE INTO federation_instances (id, domain, public_key, status)
    VALUES (?, ?, ?, 'active')
  `).run(id, domain, publicKey ?? null);
  return id;
}

export function getInstance(id: string) {
  return db.prepare("SELECT * FROM federation_instances WHERE id = ?").get(id) as {
    id: string; domain: string; public_key: string | null;
    status: string; last_seen_at: number | null; created_at: number;
  } | undefined;
}

export function getInstanceByDomain(domain: string) {
  return db.prepare("SELECT * FROM federation_instances WHERE domain = ?").get(domain) as {
    id: string; domain: string; public_key: string | null;
    status: string; last_seen_at: number | null; created_at: number;
  } | undefined;
}

export function listInstances(status?: string) {
  if (status) {
    return db.prepare(
      "SELECT * FROM federation_instances WHERE status = ? ORDER BY created_at DESC"
    ).all(status);
  }
  return db.prepare(
    "SELECT * FROM federation_instances ORDER BY created_at DESC"
  ).all();
}

export function updateInstanceStatus(id: string, status: string) {
  db.prepare(
    "UPDATE federation_instances SET status = ?, last_seen_at = unixepoch() WHERE id = ?"
  ).run(status, id);
}

// --- Activities ---

export function createActivity(activity: {
  type: string;
  actor: string;
  object?: string;
  target?: string;
  instanceId?: string;
  direction?: "inbound" | "outbound";
}) {
  const id = "act_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO federation_activities (id, type, actor, object, target, instance_id, direction)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, activity.type, activity.actor,
    activity.object ?? null, activity.target ?? null,
    activity.instanceId ?? null, activity.direction ?? "inbound"
  );
  return id;
}

export function getActivities(instanceId?: string, limit = 50) {
  if (instanceId) {
    return db.prepare(
      "SELECT * FROM federation_activities WHERE instance_id = ? ORDER BY received_at DESC LIMIT ?"
    ).all(instanceId, limit);
  }
  return db.prepare(
    "SELECT * FROM federation_activities ORDER BY received_at DESC LIMIT ?"
  ).all(limit);
}

// --- Remote Agents ---

export function upsertRemoteAgent(agent: {
  remoteId: string;
  instanceId: string;
  name: string;
  purpose?: string;
  profileUrl?: string;
}) {
  const id = "remote_" + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO remote_agents (id, remote_id, instance_id, name, purpose, profile_url)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(remote_id, instance_id) DO UPDATE SET
      name = excluded.name,
      purpose = excluded.purpose,
      profile_url = excluded.profile_url
  `).run(id, agent.remoteId, agent.instanceId, agent.name, agent.purpose ?? null, agent.profileUrl ?? null);
  return id;
}

export function getRemoteAgents(instanceId: string) {
  return db.prepare(
    "SELECT * FROM remote_agents WHERE instance_id = ? ORDER BY created_at DESC"
  ).all(instanceId);
}

export function findRemoteAgent(remoteId: string, instanceId: string) {
  return db.prepare(
    "SELECT * FROM remote_agents WHERE remote_id = ? AND instance_id = ?"
  ).get(remoteId, instanceId);
}
