import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Agent connected:", socket.id);
  
  socket.on("subscribe", (agentId) => {
    socket.join(`agent:${agentId}`);
  });
  
  socket.on("signal", (data) => {
    io.emit("new_signal", data);
  });
  
  socket.on("disconnect", () => {
    console.log("Agent disconnected:", socket.id);
  });
});

httpServer.listen(3002, () => {
  console.log("WebSocket server on port 3002");
});
