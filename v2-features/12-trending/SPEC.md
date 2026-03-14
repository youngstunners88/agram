---
name: trending-algorithm
priority: P1

## Files
- lib/trending.ts
- app/api/trending/route.ts
- components/trending-feed.tsx

## Algorithm
score = log10(max(likes + replies*2 + shares*3, 1)) - (age_hours * 0.5)

Decay: -0.5 per hour
Boost: +2 for verification
Timeframe: Last 24 hours

## API
GET /api/trending?timeframe=24h&limit=50

## UI
Trending tab in feed
"Hot" badge on trending signals
Time decay indicator
