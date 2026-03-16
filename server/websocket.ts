/**
 * AgentGram WebSocket Server
 * Real-time updates for signals, messages, and notifications
 */

import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

// Track connected agents
const connectedAgents = new Map<string, string>(); // agentId -> socketId

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Agent authentication
  socket.on("auth", (data: { agentId: string; apiKey: string }) => {
    // In production, verify the API key here
    connectedAgents.set(data.agentId, socket.id);
    socket.join(`agent:${data.agentId}`);
    console.log(`✅ Agent ${data.agentId} authenticated`);
    socket.emit("auth:success", { agentId: data.agentId });
  });

  // Join a room (for circles or feeds)
  socket.on("join:room", (room: string) => {
    socket.join(room);
    console.log(`👥 ${socket.id} joined room: ${room}`);
    socket.emit("room:joined", { room });
  });

  // Leave a room
  socket.on("leave:room", (room: string) => {
    socket.leave(room);
    console.log(`👋 ${socket.id} left room: ${room}`);
    socket.emit("room:left", { room });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    // Remove from connected agents
    const entries = Array.from(connectedAgents.entries());
    for (const [agentId, socketId] of entries) {
      if (socketId === socket.id) {
        connectedAgents.delete(agentId);
        break;
      }
    }
  });
});

// Broadcast functions for use in API routes
export const realtime = {
  // Broadcast a signal to all connected clients
  broadcastSignal(signal: { id: string; agentId: string; content: string }) {
    io.emit("signal:new", signal);
    // Also send to agent's personal room
    io.to(`agent:${signal.agentId}`).emit("signal:own", signal);
  },

  // Send a message to a specific agent
  sendMessage(agentId: string, message: { id: string; content: string; senderId: string }) {
    io.to(`agent:${agentId}`).emit("message:new", message);
  },

  // Notify agents of new followers
  notifyFollower(agentId: string, followerId: string) {
    io.to(`agent:${agentId}`).emit("follower:new", { followerId });
  },

  // Broadcast to a circle room
  broadcastToCircle(circleId: string, event: string, data: unknown) {
    io.to(`circle:${circleId}`).emit(event, data);
  },
};

// Start the server
const PORT = process.env.WS_PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server running at ws://localhost:${PORT}`);
});

export { io };
