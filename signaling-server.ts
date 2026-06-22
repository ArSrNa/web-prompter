import { Server } from "socket.io";
import { createServer } from "node:http";

const port = process.env.PORT || 9000;
const host = process.env.HOST || "0.0.0.0";
// Socket.IO path 配置（支持通过环境变量自定义）
const socketPath = process.env.SOCKET_PATH || "/socket.io/";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  path: socketPath
});

console.log(`📡 Socket.IO path: ${socketPath}`);

// 存储房间和用户的映射
const rooms = new Map<string, Set<string>>();

console.log(`🚀 WebRTC Signaling Server 启动中...`);
console.log(`   端口: ${port}`);
console.log(`   环境: ${process.env.NODE_ENV || 'development'}`);

io.on("connection", (socket) => {
  console.log(`📡 新的信令连接: ${socket.id}`);

  // 加入房间
  socket.on("join", (roomId: string) => {
    if (!roomId) {
      socket.emit("error", { message: "房间号不能为空" });
      return;
    }

    console.log(`👤 用户 ${socket.id} 尝试加入房间 ${roomId}`);

    // 如果房间不存在，创建它
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const room = rooms.get(roomId)!;

    // 检查房间是否已满（最多2人）
    if (room.size >= 2) {
      console.log(`⚠️ 房间 ${roomId} 已满`);
      socket.emit("room-full", {
        roomId,
        message: "房间已满，请稍后再试"
      });
      return;
    }

    // 加入房间
    room.add(socket.id);
    socket.join(roomId);
    socket.data.roomId = roomId;

    console.log(`✅ 用户 ${socket.id} 加入房间 ${roomId}，当前房间人数: ${room.size}`);

    // 通知用户加入成功
    socket.emit("joined", {
      roomId,
      userId: socket.id,
      peers: Array.from(room).filter(id => id !== socket.id)
    });

    // 通知房间内其他人：有新用户加入
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      message: `用户 ${socket.id} 加入了房间`
    });

    // 如果房间有2个人，通知双方可以开始连接
    if (room.size === 2) {
      console.log(`🎯 房间 ${roomId} 已满，通知双方开始 P2P 连接`);
      io.to(roomId).emit("ready", {
        message: "房间已满，可以开始 P2P 连接"
      });
    }
  });

  // 转发 offer
  socket.on("offer", (data: { roomId: string; offer: any }) => {
    if (!data?.roomId || !data?.offer) {
      console.warn(`⚠️ 收到无效的 offer 数据`);
      return;
    }
    console.log(`📤 转发 offer 从 ${socket.id} 到房间 ${data.roomId}`);
    socket.to(data.roomId).emit("offer", {
      offer: data.offer,
      senderId: socket.id
    });
  });

  // 转发 answer
  socket.on("answer", (data: { roomId: string; answer: any }) => {
    if (!data?.roomId || !data?.answer) {
      console.warn(`⚠️ 收到无效的 answer 数据`);
      return;
    }
    console.log(`📥 转发 answer 从 ${socket.id} 到房间 ${data.roomId}`);
    socket.to(data.roomId).emit("answer", {
      answer: data.answer,
      senderId: socket.id
    });
  });

  // 转发 ICE candidate
  socket.on("ice-candidate", (data: { roomId: string; candidate: any }) => {
    if (!data?.roomId || !data?.candidate) {
      console.warn(`⚠️ 收到无效的 ICE candidate 数据`);
      return;
    }
    socket.to(data.roomId).emit("ice-candidate", {
      candidate: data.candidate,
      senderId: socket.id
    });
  });

  // 断开连接
  socket.on("disconnect", () => {
    console.log(`🔌 信令连接断开: ${socket.id}`);
    const roomId = socket.data.roomId;

    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      room.delete(socket.id);

      // 通知房间内其他人：有用户离开
      socket.to(roomId).emit("user-left", {
        userId: socket.id,
        message: `用户 ${socket.id} 离开了房间`
      });

      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`🗑️ 房间 ${roomId} 已清空并删除`);
      } else {
        console.log(`ℹ️ 房间 ${roomId} 剩余人数: ${room.size}`);
      }
    }
  });
});

// 健康检查端点
httpServer.on("request", (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      rooms: rooms.size,
      connections: io.engine.clientsCount
    }));
  }
});

httpServer.listen(Number(port), host, () => {
  console.log(`✅ WebRTC 信令服务器运行在 http://${host}:${port}`);
  console.log(`   健康检查: http://${host}:${port}/health`);
  console.log(`   等待 P2P 连接建立...`);
});

// 优雅关闭
process.on("SIGTERM", () => {
  console.log("📴 收到 SIGTERM 信号，正在关闭服务器...");
  io.close(() => {
    console.log("✅ 服务器已关闭");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("📴 收到 SIGINT 信号，正在关闭服务器...");
  io.close(() => {
    console.log("✅ 服务器已关闭");
    process.exit(0);
  });
});
