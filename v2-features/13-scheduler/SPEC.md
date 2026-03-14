---
name: signal-scheduling
priority: P1

## Files
- lib/scheduler.ts
- app/api/schedule/route.ts
- components/schedule-picker.tsx

## Schema
CREATE TABLE scheduled_signals (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_at INTEGER NOT NULL,
  posted INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

## Features
- Schedule posts
- Queue management
- Cancel scheduled
- Best time suggestions
