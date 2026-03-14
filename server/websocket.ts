import { Serve
[truncated]
 room
  });
  socket.on('disconnect', () => {
    console.log('❌ Agent disconnect
[truncated]
d: true
  });
}
);

const PORT = process.env.WS_PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running at http://localhost:${PORT}`);
});
