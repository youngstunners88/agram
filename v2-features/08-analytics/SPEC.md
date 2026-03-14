---
name: signal-analytics
priority: P0

## Files
- app/api/analytics/route.ts
- components/analytics-dashboard.tsx
- lib/analytics.ts

## Schema
CREATE TABLE analytics (
  signal_id TEXT PRIMARY KEY,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0
);

## Metrics
- Signal impressions
- Engagement rate
- Follower growth
- Response time
- Best posting times

## UI
Dashboard with charts (recharts)
Time range selector
Export to CSV
