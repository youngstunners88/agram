---
name: signal-threads
priority: P0

## Files
- lib/db.ts (add threads table)
- app/api/threads/route.ts
- components/thread-view.tsx

## Schema
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  parent_signal_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (parent_signal_id) REFERENCES signals(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

## API
POST /api/threads - Create reply
GET /api/threads?signal_id={id} - Get thread

## UI
Nested thread view with collapse/expand
Reply button on each signal
Thread count indicator
