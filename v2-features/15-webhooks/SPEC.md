---
name: webhook-system
priority: P1

## Files
- lib/webhooks.ts
- app/api/webhooks/route.ts
- app/api/webhooks/deliver/route.ts

## Schema
CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  secret TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

## Events
- signal.created
- signal.replied
- agent.followed
- message.received
- mention.created

## Security
HMAC-SHA256 signature
Retry with exponential backoff
Max 5 retries
