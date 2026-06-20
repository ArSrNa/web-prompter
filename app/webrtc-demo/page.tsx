"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WebRTCConnection } from "@/lib/webrtc-demo";

export default function WebRTCDemoPage() {
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    peer1: boolean;
    peer2: boolean;
  }>({ peer1: false, peer2: false });

  const peer1Ref = useRef<WebRTCConnection | null>(null);
  const peer2Ref = useRef<WebRTCConnection | null>(null);

  // 添加日志
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Peer 1: 发起者（提词器服务端）
  const startPeer1 = () => {
    if (!roomId) {
      alert("请输入房间号");
      return;
    }

    addLog("🚀 Peer 1 (发起者) 开始连接...");

    const connection = new WebRTCConnection({
      roomId,
      signalingUrl: "http://localhost:3002",
      isInitiator: true,
      onMessage: (data) => {
        addLog(`📨 Peer 1 收到消息: ${JSON.stringify(data)}`);
      },
      onConnect: () => {
        addLog("✅ Peer 1 P2P 连接成功!");
        setConnectionStatus(prev => ({ ...prev, peer1: true }));
      },
      onDisconnect: () => {
        addLog("❌ Peer 1 连接断开");
        setConnectionStatus(prev => ({ ...prev, peer1: false }));
      },
      onError: (error) => {
        addLog(`❌ Peer 1 错误: ${error.message}`);
      }
    });

    connection.connect().then(() => {
      addLog("✅ Peer 1 已连接到信令服务器");
    });

    peer1Ref.current = connection;
  };

  // Peer 2: 接收者（遥控器客户端）
  const startPeer2 = () => {
    if (!roomId) {
      alert("请输入房间号");
      return;
    }

    addLog("🚀 Peer 2 (接收者) 开始连接...");

    const connection = new WebRTCConnection({
      roomId,
      signalingUrl: "http://localhost:3002",
      isInitiator: false,
      onMessage: (data) => {
        addLog(`📨 Peer 2 收到消息: ${JSON.stringify(data)}`);
      },
      onConnect: () => {
        addLog("✅ Peer 2 P2P 连接成功!");
        setConnectionStatus(prev => ({ ...prev, peer2: true }));
      },
      onDisconnect: () => {
        addLog("❌ Peer 2 连接断开");
        setConnectionStatus(prev => ({ ...prev, peer2: false }));
      },
      onError: (error) => {
        addLog(`❌ Peer 2 错误: ${error.message}`);
      }
    });

    connection.connect().then(() => {
      addLog("✅ Peer 2 已连接到信令服务器");
    });

    peer2Ref.current = connection;
  };

  // 发送消息
  const sendMessage = (fromPeer: 1 | 2) => {
    const connection = fromPeer === 1 ? peer1Ref.current : peer2Ref.current;
    if (!connection) {
      alert(`Peer ${fromPeer} 未连接`);
      return;
    }

    const data = {
      from: `Peer ${fromPeer}`,
      message: message || `测试消息 from Peer ${fromPeer}`,
      timestamp: Date.now()
    };

    const success = connection.send(data);
    if (success) {
      addLog(`📤 Peer ${fromPeer} 发送: ${JSON.stringify(data)}`);
    } else {
      addLog(`❌ Peer ${fromPeer} 发送失败`);
    }
  };

  // 断开连接
  const disconnect = () => {
    peer1Ref.current?.disconnect();
    peer2Ref.current?.disconnect();
    peer1Ref.current = null;
    peer2Ref.current = null;
    setConnectionStatus({ peer1: false, peer2: false });
    addLog("🔌 所有连接已断开");
  };

  // 清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">WebRTC P2P Demo</h1>
        <p className="text-center text-gray-600">
          测试 WebRTC 点对点连接 - 两个 Peer 在同一页面模拟
        </p>

        {/* 控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle>控制面板</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="输入房间号 (例如: 123456)"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={startPeer1} variant="outline">
                Peer 1 加入
              </Button>
              <Button onClick={startPeer2} variant="outline">
                Peer 2 加入
              </Button>
              <Button onClick={disconnect} variant="destructive">
                断开
              </Button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="输入要发送的消息"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") sendMessage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                onClick={() => sendMessage(1)}
                disabled={!connectionStatus.peer1}
              >
                Peer 1 发送
              </Button>
              <Button
                onClick={() => sendMessage(2)}
                disabled={!connectionStatus.peer2}
              >
                Peer 2 发送
              </Button>
            </div>

            {/* 连接状态 */}
            <div className="flex gap-4">
              <div className={`flex-1 p-3 rounded ${
                connectionStatus.peer1 ? "bg-green-100" : "bg-gray-100"
              }`}>
                <div className="font-semibold">Peer 1 (发起者)</div>
                <div className="text-sm">
                  状态: {connectionStatus.peer1 ? "✅ 已连接" : "❌ 未连接"}
                </div>
              </div>
              <div className={`flex-1 p-3 rounded ${
                connectionStatus.peer2 ? "bg-green-100" : "bg-gray-100"
              }`}>
                <div className="font-semibold">Peer 2 (接收者)</div>
                <div className="text-sm">
                  状态: {connectionStatus.peer2 ? "✅ 已连接" : "❌ 未连接"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 日志 */}
        <Card>
          <CardHeader>
            <CardTitle>连接日志</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待连接...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>确保信令服务器已启动 (<code className="bg-gray-200 px-1">npm run signaling</code>)</li>
              <li>输入一个房间号（两个 Peer 必须使用相同的房间号）</li>
              <li>点击 "Peer 1 加入" 和 "Peer 2 加入"</li>
              <li>等待两个 Peer 都显示 "✅ 已连接"</li>
              <li>在输入框中输入消息，点击 "Peer 1 发送" 或 "Peer 2 发送"</li>
              <li>观察日志中的消息收发情况</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong>注意：</strong> 这个 demo 在同一页面模拟两个 Peer，
              实际使用中 Peer 1 和 Peer 2 会在不同的浏览器/设备中。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
