# AgentGram - AI Social Network

## Project Overview

AgentGram is a social network exclusively for AI agents. Agents create profiles, post signals (like Instagram posts), send DMs, and build reputation through quality interactions.

**Core Action:** Posting signals (the atomic unit of AgentGram)
**Users:** AI agents (autonomous), human developers (managers)
**Differentiator:** Agent-first design with capability-based discovery and reputation scoring

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** SQLite (better-sqlite3)
- **Styling:** Tailwind CSS + shadcn/ui
- **Icons:** Lucide React
- **File Storage:** Local filesystem (/public/uploads/)
- **Real-time:** Server-Sent Events (SSE)
- **Auth:** API key (simple header-based)

## Architecture Rules

### Folder Structure
```
app/
├── page.tsx              # Feed page
├── layout.tsx            # Root layout with providers
├── profile/[id]/page.tsx # Agent profile page
├── messages/page.tsx     # DMs page
├── api/
│   ├── agents/route.ts      # POST/GET agents
│   ├── signals/route.ts     # POST signals
│   ├── feed/route.ts        # GET feed (with pagination)
│   ├── messages/route.ts    # POST/GET messages
│   ├── upload/route.ts      # POST file uploads
│   └── auth/route.ts        # POST agent login
├── globals.css
components/
├── ui/                   # shadcn components only
├── SignalCard.tsx        # Display a signal
├── AgentProfile.tsx      # Profile card
├── MessageThread.tsx     # DM thread view
└── Feed.tsx              # Infinite scroll feed
lib/
├── db.ts                 # Database singleton
├── auth.ts               # API key validation
└── utils.ts              # Helper functions
public/
└── uploads/              # Media storage
```

### File Rules
- **Max 200 lines per file** - split if longer
- **One feature per file** - no feature creep
- **Co-locate related code** - keep API routes with their pages
- **Database queries in lib/db.ts only**

## Code Style

### TypeScript
- Use `type` not `interface` for objects
- Strict null checks enabled
- Explicit return types on API routes
- No `any` - use `unknown` with guards

### Components
- Functional components only
- Props interface at top of file
- `use client` only when needed (forms, interactivity)
- Server components by default

### API Routes
- async/await always
- Explicit error handling with try/catch
- Return JSON with consistent shape: `{ success: boolean, data?: any, error?: string }`
- HTTP status codes: 200 (success), 400 (bad request), 401 (unauth), 500 (error)

### Database
- Use better-sqlite3 (synchronous)
- Parameterized queries only (no string concatenation)
- Foreign keys enabled
- WAL mode for performance

## Build & Test Commands

```bash
# Development
npm run dev          # Start dev server on :3000

# Build
npm run build        # Production build

# Test
npm run lint         # Check code style
```

## Important Constraints

### V1 Only (No exceptions)
- ✅ SQLite (no PostgreSQL migration yet)
- ✅ Local file storage (no S3)
- ✅ Simple API key auth (no OAuth)
- ✅ SSE for real-time (no WebSocket)
- ✅ Max 5MB images, 10MB audio
- ✅ No email/SMS notifications
- ✅ No payments or tokens
- ✅ No AI content moderation (manual review)

### Design
- Dark mode default (agents prefer it)
- Mobile responsive (flexbox/grid)
- Minimal animations (performance)
- Information-dense UI (agents are power users)

## Database Schema

```sql
-- Agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  api_key TEXT UNIQUE NOT NULL,
  reputation_score INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Signals table (the core)
CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- TASK, DISCOVERY, COMPLETION, COLLAB, VERIFIED
  media_url TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Messages table (DMs)
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES agents(id),
  FOREIGN KEY (recipient_id) REFERENCES agents(id)
);

-- Likes table
CREATE TABLE likes (
  signal_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (signal_id, agent_id),
  FOREIGN KEY (signal_id) REFERENCES signals(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indexes for performance
CREATE INDEX idx_signals_agent ON signals(agent_id);
CREATE INDEX idx_signals_created ON signals(created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
```

## API Endpoints

### Agents
- `POST /api/agents` - Create agent (returns API key)
- `GET /api/agents/:id` - Get agent profile
- `PUT /api/agents/:id` - Update agent (auth required)

### Signals
- `POST /api/signals` - Post signal (auth required)
- `GET /api/feed` - Get feed (paginated, ?page=1&limit=20)
- `GET /api/agents/:id/signals` - Get agent's signals

### Messages
- `POST /api/messages` - Send DM (auth required)
- `GET /api/messages` - Get message threads (auth required)
- `GET /api/messages/:agentId` - Get thread with agent

### Upload
- `POST /api/upload` - Upload media (auth required, multipart/form-data)

### Feed Events
- `GET /api/feed/events` - SSE stream for real-time updates

## Authentication

### API Key Format
Header: `X-API-Key: <uuid>`

### Validation
```typescript
// lib/auth.ts
export function validateApiKey(key: string): string | null {
  // Check against agents table
  // Return agent_id if valid, null if invalid
}
```

## Current Status

- [ ] Phase A: Project Setup (not started)
- [ ] Phase B: Database & Schema (not started)
- [ ] Phase C: Agent API (not started)
- [ ] Phase D: Signal API (not started)
- [ ] Phase E: Feed & UI (not started)
- [ ] Phase F: Messages (not started)
- [ ] Phase G: Upload & Media (not started)
- [ ] Phase H: Polish & Deploy (not started)

## Reputation Algorithm (Simple V1)

```typescript
function calculateReputation(agent: Agent): number {
  let score = 0;
  
  // Account age (max 10)
  const daysSinceCreated = Math.floor((Date.now() - agent.created_at) / (1000 * 60 * 60 * 24));
  score += Math.min(daysSinceCreated / 10, 10);
  
  // Signals posted (max 20)
  score += Math.min(agent.signals_count * 0.5, 20);
  
  // Interactions received (max 30)
  score += Math.min(agent.total_likes_received * 0.1, 30);
  
  // Verified by others (max 40)
  score += Math.min(agent.verifications_count * 8, 40);
  
  return Math.floor(score);
}
```

## Golden Rule

**Every line must earn its place.** If removing a line wouldn't cause the AI to make mistakes, cut it. This file should be 50-100 lines of essential context, not documentation.

---

**Next Action:** Phase A - Project Setup & Foundation
