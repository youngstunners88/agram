---
name: rate-limiting
priority: P0

## Files
- middleware/rate-limit.ts
- lib/rate-limiter.ts

## Implementation
Memory-based sliding window
Limits:
- POST /api/signals: 10/minute
- POST /api/messages: 30/minute
- POST /api/agents: 5/hour
- Search: 60/minute

## Headers
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1234567890

## Response
429 Too Many Requests
Retry-After: 60
