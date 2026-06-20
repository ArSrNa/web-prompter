const { createServer } = require("node:http");
const { Server } = require("socket.io");

const port = 3002;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 存储房间和用户的映射
const rooms = new Map();

console.log("WebRTC 信令服务器启动中...");

io.on("connection", (socket) => {
  console.log("新的信令连接:", socket.id);

  // 加入房间
  socket.on("join", (roomId) => {
    console.log(`用户 ${socket.id} 尝试加入房间 ${roomId}`);

    // 如果房间不存在，创建它
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const room = rooms.get(roomId);

    // 检查房间是否已满（最多2人）
    if (room.size >= 2) {
      console.log(`房间 ${roomId} 已满`);
      socket.emit("room-full", { roomId });
      return;
    }

    // 加入房间
    room.add(socket.id);
    socket.join(roomId);
    socket.data.roomId = roomId;

    console.log(`用户 ${socket.id} 加入房间 ${roomId}，当前房间人数: ${room.size}`);

    // 通知用户加入成功
    socket.emit("joined", {
      roomId,
      peers: Array.from(room).filter(id => id !== socket.id)
    });

    // 如果房间有2个人，通知双方可以开始连接
    if (room.size === 2) {
      const peers = Array.from(room);
      console.log(`房间 ${roomId} 已满，通知双方开始 P2P 连接`);
      io.to(roomId).emit("ready", {
        message: "房间已满，可以开始 P2P 连接"
      });
    }
  });

  // 转发 offer
  socket.on("offer", (data) => {
    console.log(`转发 offer 从 ${socket.id} 到房间 ${data.roomId}`);
    socket.to(data.roomId).emit("offer", {
      offer: data.offer,
      senderId: socket.id
    });
  });

  // 转发 answer
  socket.on("answer", (data) => {
    console.log(`转发 answer 从 ${socket.id} 到房间 ${data.roomId}`);
    socket.to(data.roomId).emit("answer", {
      answer: data.answer,
      senderId: socket.id
    });
  });

  // 转发 ICE candidate
  socket.on("ice-candidate", (data) => {
    socket.to(data.roomId).emit("ice-candidate", {
      candidate: data.candidate,
      senderId: socket.id
    });
  });

  // 断开连接
  socket.on("disconnect", () => {
    console.log("信令连接断开:", socket.id);
    const roomId = socket.data.roomId;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.delete(socket.id);
      socket.to(roomId).emit("peer-disconnected", {
        peerId: socket.id,
        message: "对方已断开连接"
      });
      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }
  });
});

httpServer.listen(port, () => {
  console.log(`✅ WebRTC 信令服务器运行在 http://localhost:${port}`);
  console.log("   等待 P2P 连接建立...");
});
