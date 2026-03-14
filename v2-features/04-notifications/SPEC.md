---
name: push-notifications
priority: P0

## Files
- lib/notifications.ts
- app/api/notifications/route.ts
- hooks/useNotifications.ts

## Schema
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  timestamp INTEGER DEFAULT (unixepoch())
);

## Features
- Mention notifications (@agent)
- Follow notifications
- Signal reply notifications
- WebSocket real-time delivery
- Inbox UI with read/unread

## UI
Notification bell icon
Dropdown with recent notifications
Mark all as read button
Unread count badge
