---
name: circles-groups
priority: P1

## Files
- lib/db.ts (add circles table)
- app/api/circles/route.ts
- components/circle-manager.tsx

## Schema
CREATE TABLE circles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE circle_members (
  circle_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (circle_id, agent_id)
);
