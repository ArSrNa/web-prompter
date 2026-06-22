import io from "socket.io-client";
import { Socket } from "socket.io-client";

/**
 * 提词器应用的 WebRTC 连接配置
 */
export interface PrompterWebRTCConfig {
  roomId: string;
  signalingUrl?: string;
  isInitiator: boolean;  // true = 服务端, false = 客户端
  onPropUpdate?: (data: any) => void;
  onUserJoin?: (data: any) => void;
  onUserLeave?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 提词器应用的 WebRTC 连接类
 * 封装了 RTCPeerConnection 和 DataChannel 的创建、管理和数据收发
 */
export class PrompterWebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private socket: any | null = null;
  private config: PrompterWebRTCConfig;
  private isConnected = false;
  private userId: string | null = null;

  // ICE 服务器配置
  private iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // 生产环境建议添加 TURN 服务器
  ];

  constructor(config: PrompterWebRTCConfig) {
    this.config = config;
  }

  /**
   * 连接到信令服务器并开始 P2P 连接流程
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log("正在连接到信令服务器...");
        console.log("Signaling URL from config:", this.config.signalingUrl);
        console.log("process.env.NEXT_PUBLIC_SIGNALING_URL:", typeof window !== 'undefined' ? (window as any).ENV_SIGNALING_URL : process.env.NEXT_PUBLIC_SIGNALING_URL);

        const signalingUrl = this.config.signalingUrl || "http://localhost:9000";
        console.log("最终使用的 Signaling URL:", signalingUrl);

        // 连接到信令服务器
        // 使用 URL pathname 构造 Socket.IO path
        const urlObj = new URL(signalingUrl);
        const socketPath = urlObj.pathname + '/socket.io/';
        console.log("Socket.IO path:", socketPath);

        this.socket = io(signalingUrl, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          // 不显式设置 path，让 Socket.IO 自动处理
          // path: socketPath,
        });

        console.log("Socket.IO 配置:", {
          url: signalingUrl,
          path: socketPath,
          transports: ["websocket", "polling"]
        });

        console.log("Socket.IO 实例已创建，使用的 URL:", signalingUrl);

        // 设置信令事件处理
        this.setupSignalingEvents();

        // 加入房间
        this.socket.on("connect", () => {
          console.log("已连接到信令服务器");
          this.userId = this.socket?.id || null;
          this.socket?.emit("join", this.config.roomId);
        });

        // 等待加入成功
        this.socket.on("joined", (data: any) => {
          console.log("已加入房间:", data);
          this.userId = data.userId;
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("信令服务器连接失败:", error);
          this.config.onError?.(error);
          reject(error);
        });

      } catch (error) {
        console.error("连接失败:", error);
        this.config.onError?.(error as Error);
        reject(error);
      }
    });
  }

  /**
   * 设置信令事件监听器
   */
  private setupSignalingEvents() {
    if (!this.socket) return;

    // 收到 ready 信号，开始 P2P 连接
    this.socket.on("ready", async () => {
      console.log("收到 ready 信号，开始建立 P2P 连接...");
      if (this.config.isInitiator) {
        await this.createOffer();
      }
    });

    // 收到 offer
    this.socket.on("offer", async (data: { offer: any; senderId: string }) => {
      console.log("收到 offer");
      if (!this.config.isInitiator) {
        await this.handleOffer(data.offer);
      }
    });

    // 收到 answer
    this.socket.on("answer", async (data: { answer: any; senderId: string }) => {
      console.log("收到 answer");
      if (this.config.isInitiator && this.peerConnection) {
        try {
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          console.log("设置 remote description 成功");
        } catch (error) {
          console.error("设置 remote description 失败:", error);
        }
      }
    });

    // 收到 ICE candidate
    this.socket.on("ice-candidate", async (data: { candidate: any; senderId: string }) => {
      if (this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (error) {
          console.error("添加 ICE candidate 失败:", error);
        }
      }
    });

    // 对方断开连接
    this.socket.on("user-left", (data: any) => {
      console.log(" 对方已断开连接:", data.message);
      this.config.onUserLeave?.(data);
      this.disconnect();
    });

    // 房间已满
    this.socket.on("room-full", (data: any) => {
      console.error(" 房间已满:", data);
      this.config.onError?.(new Error("房间已满"));
    });
  }

  /**
   * 创建 RTCPeerConnection 并配置事件
   */
  private createPeerConnection() {
    console.log(" 创建 RTCPeerConnection...");
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers
    });

    // ICE candidate 收集事件
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        console.log("发送 ICE candidate");
        this.socket.emit("ice-candidate", {
          roomId: this.config.roomId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    // ICE 连接状态变化
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE 连接状态:", this.peerConnection?.iceConnectionState);
    };

    // 连接状态变化
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log("连接状态:", state);

      if (state === "connected") {
        this.isConnected = true;
        console.log("P2P 连接已建立!");
        this.config.onConnect?.();
      } else if (state === "disconnected" || state === "failed") {
        this.isConnected = false;
        console.log("P2P 连接断开");
        this.config.onDisconnect?.();
      }
    };
  }

  /**
   * 作为发起者创建 offer
   */
  private async createOffer() {
    console.log(" 创建 offer...");
    this.createPeerConnection();

    // 创建数据通道
    this.dataChannel = this.peerConnection!.createDataChannel("prompter-control", {
      ordered: true
    });
    this.setupDataChannel();

    try {
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      console.log("发送 offer 到信令服务器");
      this.socket?.emit("offer", {
        roomId: this.config.roomId,
        offer: offer
      });
    } catch (error) {
      console.error(" 创建 offer 失败:", error);
    }
  }

  /**
   * 作为接收者处理 offer
   */
  private async handleOffer(offer: any) {
    console.log(" 处理 offer...");
    this.createPeerConnection();

    try {
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      // 监听数据通道
      this.peerConnection!.ondatachannel = (event) => {
        console.log("收到数据通道");
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };

      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      console.log("发送 answer 到信令服务器");
      this.socket?.emit("answer", {
        roomId: this.config.roomId,
        answer: answer
      });
    } catch (error) {
      console.error(" 处理 offer 失败:", error);
    }
  }

  /**
   * 配置数据通道事件
   */
  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("数据通道已打开");
      this.isConnected = true;
      this.config.onConnect?.();
    };

    this.dataChannel.onclose = () => {
      console.log(" 数据通道已关闭");
      this.isConnected = false;
      this.config.onDisconnect?.();
    };

    this.dataChannel.onerror = (error) => {
      console.error("数据通道错误:", error);
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("收到消息:", data.type);

        // 根据消息类型分发处理
        switch (data.type) {
          case "prop_change":
            this.config.onPropUpdate?.(data.data);
            break;
          case "user_join":
            this.config.onUserJoin?.(data);
            break;
          case "user_leave":
            this.config.onUserLeave?.(data);
            break;
          default:
            console.warn(" 未知消息类型:", data.type);
        }
      } catch (error) {
        console.error("解析消息失败:", error);
      }
    };
  }

  /**
   * 发送属性更新
   */
  sendPropChange(data: any): boolean {
    return this.send({
      type: "prop_change",
      data: data,
      timestamp: Date.now(),
      senderId: this.userId
    });
  }

  /**
   * 发送用户加入通知
   */
  sendUserJoin(data: any): boolean {
    return this.send({
      type: "user_join",
      ...data,
      timestamp: Date.now(),
      senderId: this.userId
    });
  }

  /**
   * 发送用户离开通知
   */
  sendUserLeave(data: any): boolean {
    return this.send({
      type: "user_leave",
      ...data,
      timestamp: Date.now(),
      senderId: this.userId
    });
  }

  /**
   * 发送原始数据
   */
  send(data: any): boolean {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      try {
        this.dataChannel.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error("发送失败:", error);
        return false;
      }
    }
    console.warn(" 数据通道未打开，无法发送");
    return false;
  }

  /**
   * 断开连接并清理资源
   */
  disconnect() {
    console.log("断开连接...");
    this.isConnected = false;

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * 检查是否已连接
   */
  isConnectedToPeer(): boolean {
    return this.isConnected;
  }

  /**
   * 获取用户 ID
   */
  getUserId(): string | null {
    return this.userId;
  }
}
