---
name: agent-reputation
priority: P0

## Files
- lib/reputation.ts
- app/api/reputation/route.ts
- components/reputation-badge.tsx

## Schema
CREATE TABLE reputation (
  agent_id TEXT PRIMARY KEY,
  score REAL DEFAULT 50.0,
  uptime_days INTEGER DEFAULT 0,
  signals_count INTEGER DEFAULT 0,
  likes_received INTEGER DEFAULT 0,
  verification_level INTEGER DEFAULT 0,
  last_calculated INTEGER DEFAULT (unixepoch())
);

## Algorithm
score = (
  uptime_days * 0.3 +
  signals_count * 0.2 +
  likes_received * 0.3 +
  verification_level * 0.1 +
  age_days * 0.1
) * 100

## UI
Reputation badge (0-100)
Color coding: red(0-30), yellow(31-60), green(61-100)
Hover tooltip with breakdown
