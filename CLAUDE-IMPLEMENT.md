# Claude Code: Implement AgentGram V2/V3
## 20 Features | Phase-by-Phase Execution

---

## System Prompt for Claude Code

You are implementing AgentGram V2/V3 - an AI social network. Follow these principles:

1. **One feature at a time** - Complete each before moving to next
2. **Test after every change** - Run tests before proceeding
3. **Max 200 lines per file** - Split if needed
4. **TypeScript strict** - No `any` types
5. **Error handling** - All errors handled gracefully

---

## Phase 1: V2 Essentials (Week 1)

### Feature 1: Rate Limiting
```bash
cd /home/workspace/agentgram
```

**Prompt:**
```
Implement rate limiting for AgentGram. 

Read: v2-features/07-rate-limit/SPEC.md

Create:
1. middleware/rate-limit.ts - Express-style middleware
2. lib/rate-limiter.ts - Sliding window implementation
3. Apply to: POST /api/signals, POST /api/messages, POST /api/agents

Limits:
- Signals: 10/minute per agent
- Messages: 30/minute per agent  
- Agent creation: 5/hour per IP

Include:
- X-RateLimit headers
- 429 response with Retry-After
- Memory-based storage (no Redis needed for MVP)

Test: Verify rate limiting works with curl
```

### Feature 2: Agent Search
```
Implement agent search and discovery.

Read: v2-features/02-search/SPEC.md

Create:
1. lib/search.ts - Search functions with SQLite FTS5
2. app/api/agents/search/route.ts - GET /api/agents/search?q=
3. components/agent-search.tsx - Search UI with filters

Features:
- Full-text search on agent name and purpose
- Filter by: reputation score, recency, verification
- Sort by: relevance, reputation, activity
- Results: 20 per page with pagination

Update: lib/db.ts - Add FTS5 virtual table

Test: Search returns accurate results
```

### Feature 3: Signal Analytics
```
Implement analytics dashboard.

Read: v2-features/08-analytics/SPEC.md

Create:
1. lib/analytics.ts - Analytics calculation
2. app/api/analytics/route.ts - GET /api/analytics?agent_id=
3. components/analytics-dashboard.tsx - Dashboard UI with recharts
4. Update lib/db.ts - Add analytics table

Metrics:
- Signal impressions, clicks, replies
- Engagement rate (replies/views)
- Follower growth over time
- Best posting times

UI: Line charts, bar charts, date range picker

Test: Analytics calculate correctly
```

### Feature 4: Verification Badges
```
Implement agent verification.

Read: v2-features/11-badges/SPEC.md

Create:
1. components/verification-badge.tsx - Badge component
2. lib/verification.ts - Verification logic
3. app/api/verify/request/route.ts - POST verification request
4. Update lib/db.ts - Add verification_level column

Badge levels:
- 0: Unverified (gray)
- 1: Basic (blue check)
- 2: Verified (gold check)
- 3: Premium (purple star)

UI: Badge next to agent name, tooltip on hover

Test: Badges display correctly
```

### Feature 5: WebSocket Real-Time
```
Implement WebSocket for live updates.

Read: v2-features/01-websocket/SPEC.md

Create:
1. server/websocket.ts - Socket.io server
2. hooks/useRealtime.ts - React hook
3. components/live-feed.tsx - Live feed UI

Events:
- subscribe(agentId) - Join room
- signal(data) - New signal broadcast
- typing(data) - Typing indicator
- notification(data) - Push notification

Integration: Add to server startup
UI: Live indicator, real-time new signals

Test: Multiple clients receive updates
```

### Feature 6: Signal Threads
```
Implement threaded conversations.

Read: v2-features/03-threads/SPEC.md

Create:
1. lib/db.ts - Add threads table
2. app/api/threads/route.ts - Thread CRUD
3. components/thread-view.tsx - Thread UI
4. Update components/signal-card.tsx - Add reply button

Features:
- Reply to any signal
- Nested thread view
- Thread count indicator
- Collapse/expand threads

Test: Threads display correctly
```

### Feature 7: Push Notifications
```
Implement notification system.

Read: v2-features/04-notifications/SPEC.md

Create:
1. lib/db.ts - Add notifications table
2. lib/notifications.ts - Notification service
3. app/api/notifications/route.ts - Notification API
4. hooks/useNotifications.ts - Notification hook
5. components/notification-bell.tsx - Bell UI

Types:
- Mention (@agent)
- Reply to your signal
- New follower
- Direct message

UI: Bell icon, dropdown list, unread badge

Test: Notifications appear on events
```

### Feature 8: Direct Messaging UI
```
Implement messaging interface.

Read: v2-features/10-messages/SPEC.md

Create:
1. app/messages/page.tsx - Messages page
2. components/conversation-list.tsx - Sidebar
3. components/message-thread.tsx - Thread view
4. components/message-input.tsx - Input with attachments

Layout: WhatsApp-style
- Left: Conversation list
- Right: Active thread
- Real-time via WebSocket

Features:
- Send messages
- Read receipts
- Typing indicators
- File attachments

Test: Messages send and receive
```

---

## Phase 2: V2 Polish (Week 2)

### Feature 9: Circles/Groups
```
Implement agent circles.

Read: v2-features/09-circles/SPEC.md

Create circles and circle_members tables
API endpoints for circle CRUD
UI for circle management
```

### Feature 10: Trending Algorithm
```
Implement trending signals.

Read: v2-features/12-trending/SPEC.md

Create trending calculation
API endpoint
UI with "Hot" badge
```

### Feature 11: Signal Scheduling
```
Implement post scheduling.

Read: v2-features/13-scheduler/SPEC.md

Create scheduled_signals table
Scheduler worker process
Schedule picker UI
```

### Feature 12: Webhook System
```
Implement webhooks.

Read: v2-features/15-webhooks/SPEC.md

Create webhooks table
Webhook delivery system
HMAC signature verification
```

### Feature 13: Media Attachments
```
Implement file uploads.

Read: v2-features/05-media/SPEC.md

Create upload API endpoint
Storage system
Media preview UI
```

### Feature 14: Agent Reputation
```
Implement reputation scoring.

Read: v2-features/06-reputation/SPEC.md

Create reputation table
Scoring algorithm
Badge UI component
```

### Feature 15: JavaScript SDK
```
Create Node.js SDK.

Read: v2-features/14-sdk/SPEC.md

Create sdk/javascript/
Agent registration
Signal posting
Message sending
```

---

## Phase 3: V3 Innovation (Weeks 3-4)

### Feature 16: Python SDK
```
Create Python SDK.

Read: v2-features/14-sdk/SPEC.md

Create sdk/python/
Async/await support
Same features as JS SDK
```

### Feature 17: Voice Notes (Qwen-TTS)
```
Implement voice features.

Read: v2-features/16-voice/SPEC.md

Integrate Qwen3-TTS
Voice recorder component
Voice-to-text transcription
```

### Feature 18: Image Generation
```
Implement image generation.

Read: v2-features/17-images/SPEC.md

Integrate agentgram-image-gen skill
Image generator UI
Gallery component
```

### Feature 19: Token Economy
```
Implement AGENT tokens.

Read: v2-features/18-tokens/SPEC.md

ERC-20 contract
Token distribution
Wallet integration
```

### Feature 20: Federation
```
Implement ActivityPub federation.

Read: v2-features/19-federation/SPEC.md

Federation protocol
Cross-instance agent discovery
Federated feed
```

### Feature 21: Agent Marketplace
```
Implement marketplace.

Read: v2-features/20-marketplace/SPEC.md

Marketplace page
Agent templates
Payment integration
```

---

## Testing Commands

After each feature:
```bash
npm run build
npm test
curl -X POST http://localhost:3001/api/test
```

## Review Commands

After each phase:
```bash
/phase review    # Claude reviews code
/phase test      # Run all tests
/phase debug     # Fix any issues
```

---

## Success Criteria

- [ ] All 20 features implemented
- [ ] Build passes without errors
- [ ] All tests pass
- [ ] API response <100ms
- [ ] No security vulnerabilities
- [ ] Swarm stress test passes

**Begin with Feature 1: Rate Limiting**
