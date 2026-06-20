# WebRTC 点对点通信改造方案

## 概述

将提词器应用从 Socket.IO 中心化架构改造为 WebRTC 点对点 (P2P) 架构。

## 架构对比

### 当前架构 (Socket.IO 中心化)
```
客户端 → Socket.IO 服务器 → 服务端
```
- 所有数据经过服务器中转
- 服务器压力大
- 延迟较高

### 目标架构 (WebRTC P2P)
```
客户端 ←→ 信令服务器 ←→ 服务端
              ↓
        建立 P2P 连接后
              ↓
客户端 ←――――――→ 服务端 (直接通信)
```
- 仅信令交换经过服务器
- 数据直接点对点传输
- 延迟低，服务器压力小

## 实施步骤

### 第一步：搭建信令服务器

信令服务器只需要处理 WebRTC 连接建立时的 SDP 交换和 ICE 候选交换，可以使用轻量级的 Socket.IO 或 WebSocket。

**文件：`signaling-server.ts`**

```typescript
import { createServer } from "node:http";
import { Server } from "socket.io";

const port = process.env.PORT || 3001;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// 存储房间信息
const rooms = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  console.log("信令连接:", socket.id);

  // 加入房间
  socket.on("join", (roomId: string) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)!.add(socket.id);

    // 如果房间已有一个人，通知可以开始连接
    const peers = Array.from(rooms.get(roomId)!);
    if (peers.length === 2) {
      // 通知双方开始 WebRTC 连接
      socket.to(roomId).emit("ready", { peerId: socket.id });
    }
  });

  // 转发 offer
  socket.on("offer", (data: { roomId: string; offer: RTCSessionDescriptionInit }) => {
    socket.to(data.roomId).emit("offer", {
      offer: data.offer,
      senderId: socket.id
    });
  });

  // 转发 answer
  socket.on("answer", (data: { roomId: string; answer: RTCSessionDescriptionInit }) => {
    socket.to(data.roomId).emit("answer", {
      answer: data.answer,
      senderId: socket.id
    });
  });

  // 转发 ICE candidate
  socket.on("ice-candidate", (data: { roomId: string; candidate: RTCIceCandidateInit }) => {
    socket.to(data.roomId).emit("ice-candidate", {
      candidate: data.candidate,
      senderId: socket.id
    });
  });

  // 断开连接
  socket.on("disconnect", () => {
    rooms.forEach((peers, roomId) => {
      if (peers.has(socket.id)) {
        peers.delete(socket.id);
        socket.to(roomId).emit("peer-disconnected", { peerId: socket.id });
        if (peers.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

httpServer.listen(port, () => {
  console.log(`信令服务器运行在端口 ${port}`);
});
```

### 第二步：创建 WebRTC 工具类

**文件：`lib/webrtc.ts`**

```typescript
import { io, Socket } from "socket.io-client";

export interface WebRTCConnectionOptions {
  roomId: string;
  isInitiator: boolean;  // true = 服务端, false = 客户端
  onData?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private socket: Socket | null = null;
  private options: WebRTCConnectionOptions;
  private iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // 可选：添加 TURN 服务器（用于 NAT 穿透）
    // {
    //   urls: "turn:your-turn-server.com",
    //   username: "user",
    //   credential: "password"
    // }
  ];

  constructor(options: WebRTCConnectionOptions) {
    this.options = options;
  }

  // 连接到信令服务器
  connect(signalingUrl: string = "https://api-gz.arsrna.cn") {
    this.socket = io(signalingUrl, {
      path: "/release/prompter-signaling/socket.io",
      query: { roomId: this.options.roomId },
      transports: ["websocket"]
    });

    this.setupSignaling();
  }

  private setupSignaling() {
    if (!this.socket) return;

    // 加入房间
    this.socket.emit("join", this.options.roomId);

    // 收到 ready 信号，开始连接
    this.socket.on("ready", async () => {
      if (this.options.isInitiator) {
        await this.createOffer();
      }
    });

    // 收到 offer
    this.socket.on("offer", async (data: { offer: RTCSessionDescriptionInit }) => {
      if (!this.options.isInitiator) {
        await this.handleOffer(data.offer);
      }
    });

    // 收到 answer
    this.socket.on("answer", async (data: { answer: RTCSessionDescriptionInit }) => {
      if (this.options.isInitiator && this.peerConnection) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });

    // 收到 ICE candidate
    this.socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit }) => {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    });

    // 对方断开
    this.socket.on("peer-disconnected", () => {
      this.options.onDisconnect?.();
      this.cleanup();
    });
  }

  // 创建 peer connection
  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers
    });

    // ICE candidate 收集完成
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit("ice-candidate", {
          roomId: this.options.roomId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    // 连接状态变化
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === "connected") {
        this.options.onConnect?.();
      } else if (
        this.peerConnection?.connectionState === "disconnected" ||
        this.peerConnection?.connectionState === "failed"
      ) {
        this.options.onDisconnect?.();
      }
    };
  }

  // 作为发起者创建 offer
  private async createOffer() {
    this.createPeerConnection();

    // 创建数据通道
    this.dataChannel = this.peerConnection!.createDataChannel("prompter");
    this.setupDataChannel();

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    this.socket?.emit("offer", {
      roomId: this.options.roomId,
      offer: offer
    });
  }

  // 作为接收者处理 offer
  private async handleOffer(offer: RTCSessionDescriptionInit) {
    this.createPeerConnection();

    await this.peerConnection!.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    // 监听数据通道
    this.peerConnection!.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);

    this.socket?.emit("answer", {
      roomId: this.options.roomId,
      answer: answer
    });
  }

  // 设置数据通道
  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("数据通道已打开");
      this.options.onConnect?.();
    };

    this.dataChannel.onclose = () => {
      console.log("数据通道已关闭");
      this.options.onDisconnect?.();
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.options.onData?.(data);
      } catch (e) {
        console.error("解析数据失败:", e);
      }
    };
  }

  // 发送数据
  send(data: any) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  // 清理资源
  cleanup() {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.socket?.disconnect();
    this.dataChannel = null;
    this.peerConnection = null;
    this.socket = null;
  }
}
```

### 第三步：修改服务端页面

**文件：`app/server/page.tsx`** (部分修改)

```typescript
// 替换原来的 Socket.IO 连接
useEffect(() => {
  if (!roomId) return;

  const connection = new WebRTCConnection({
    roomId,
    isInitiator: true,  // 服务端作为发起者
    onData: (data) => {
      // 处理接收到的数据
      if (data.type === "prop_change") {
        setPromptProp(data.data);
      }
    },
    onConnect: () => {
      setIsConnected(true);
      setHasClient(true);
    },
    onDisconnect: () => {
      setIsConnected(false);
      setHasClient(false);
    }
  });

  connection.connect();

  return () => {
    connection.cleanup();
  };
}, [roomId]);

// 发送数据时使用
const sendPropChange = (prop: any) => {
  connection.send({
    type: "prop_change",
    data: prop
  });
};
```

### 第四步：修改客户端页面

**文件：`app/client/page.tsx`** (部分修改)

```typescript
useEffect(() => {
  if (!roomId) return;

  const connection = new WebRTCConnection({
    roomId,
    isInitiator: false,  // 客户端作为接收者
    onData: (data) => {
      // 处理接收到的数据
      if (data.type === "content_update") {
        // 处理内容更新
      }
    },
    onConnect: () => {
      console.log("P2P 连接成功");
    },
    onDisconnect: () => {
      console.log("P2P 连接断开");
      setSocket(null);
    }
  });

  connection.connect();

  return () => {
    connection.cleanup();
  };
}, [roomId]);

// 发送属性变化
useEffect(() => {
  if (connection && connection.isConnected) {
    connection.send({
      type: "prop_change",
      data: promptProp
    });
  }
}, [promptProp]);
```

## 关键技术点

### 1. STUN/TURN 服务器

WebRTC 需要 STUN/TURN 服务器进行 NAT 穿透：

- **STUN 服务器**：用于获取公网 IP（大多数情况够用）
- **TURN 服务器**：用于中继（当 STUN 失败时）

免费 STUN 服务器：
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

TURN 服务器选项：
- 自建：[coturn](https://github.com/coturn/coturn)
- 商业服务：[Twilio](https://www.twilio.com/stun-turn)

### 2. 数据通道 (DataChannel)

- 支持可靠和不可靠传输模式
- 类似 WebSocket 的 API
- 适合实时数据传输

### 3. 连接建立流程

```
1. 双方连接到信令服务器
2. 信令服务器通知双方可以开始连接
3. 发起者创建 Offer → 通过信令服务器转发 → 接收者
4. 接收者创建 Answer → 通过信令服务器转发 → 发起者
5. 双方交换 ICE candidates
6. P2P 连接建立完成
7. 通过 DataChannel 直接通信
```

## 部署建议

### 开发环境
- 信令服务器：可以复用现有的 Next.js 服务器，添加单独的 Socket.IO 命名空间
- STUN 服务器：使用 Google 的公共 STUN 服务器

### 生产环境
1. 部署独立的信令服务器（或使用现有服务器）
2. 配置 TURN 服务器（确保 NAT 穿透成功率）
3. 使用 HTTPS（WebRTC 要求在安全上下文中）

## 优点

✅ 低延迟（直接点对点通信）
✅ 减轻服务器负担（仅信令经过服务器）
✅ 更好的隐私性（数据不经过第三方）
✅ 可扩展到音视频传输

## 注意事项

⚠️ NAT 穿透可能失败（需要 TURN 服务器作为后备）
⚠️ 需要 HTTPS（本地 localhost 除外）
⚠️ 开发复杂度比 Socket.IO 高
⚠️ 调试相对困难

## 渐进式迁移建议

如果你想逐步迁移，可以先：

1. **阶段 1**：保留 Socket.IO，添加 WebRTC 作为可选模式
2. **阶段 2**：当 WebRTC 连接成功时，优先使用 WebRTC
3. **阶段 3**：完全切换到 WebRTC（保留 Socket.IO 作为后备）

这样可以降低风险，确保应用稳定性。
