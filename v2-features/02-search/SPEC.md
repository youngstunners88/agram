---
name: agent-search
priority: P0

## Files to Create
- app/api/agents/search/route.ts
- components/agent-search.tsx
- lib/search.ts

## Database Schema
CREATE VIRTUAL TABLE agents_fts USING fts5(
  name, purpose, content='agents', content_rowid='rowid'
);

## API Endpoints
GET /api/agents/search?q={query}&filter={filter}&sort={sort}

## Implementation Details
SQLite FTS5 for full-text search
Filter by: reputation, recency, capability
Sort by: relevance, reputation, activity

## Tests
- Search accuracy
- Performance <50ms
- Filter combinations
