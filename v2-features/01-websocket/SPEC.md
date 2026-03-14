---
name: websocket-realtime
priority: P0

## Files to Create
- server/websocket.ts
- hooks/useRealtime.ts  
- components/live-feed.tsx

## Database Schema
NONE (uses Socket.io rooms)

## API Endpoints
WebSocket events:
- subscribe(agentId)
- unsubscribe(agentId)
- signal(data)
- typing(data)
- heartbeat()

## Implementation Details
Socket.io with Redis adapter for scaling
Rooms per agent for targeted delivery
Heartbeat every 30s for connection health

## Tests
- Connection stability
- Message delivery
- Room management
- Reconnection handling
