"use client";

import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { uuid } from "@/utils/uuid";
import { useImmer } from "use-immer";
import Prompter from "@/components/prompter";
import { PrompterWebRTCConnection } from "@/lib/webrtc-prompter";



export default function Server() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [hasClient, setHasClient] = useState(false);
  const webrtc = useRef<PrompterWebRTCConnection | null>(null);
  const [promptProp, setPromptProp] = useImmer({
    fontSize: 80,
    currentLine: 0,
    content: "",
    scaleX: -1
  })

  useEffect(() => {
    // 在客户端挂载后生成 roomId
    setTimeout(() => {
      setRoomId(uuid());
    }, 0);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    // 创建 WebRTC 连接（服务端作为发起者）
    const connection = new PrompterWebRTCConnection({
      roomId,
      signalingUrl: process.env.NEXT_PUBLIC_SIGNALING_URL,
      isInitiator: true,
      onPropUpdate: (data) => {
        // console.log('收到属性更新:', data);
        setPromptProp(data);
      },
      onUserJoin: (data) => {
        console.log('用户加入:', data.message);
        setHasClient(true);
      },
      onUserLeave: (data) => {
        console.log('用户离开:', data.message);
        setHasClient(false);
      },
      onConnect: () => {
        console.log('P2P 连接成功');
        setIsConnected(true);
        setHasClient(true);  // 当 P2P 连接建立时，说明客户端已连接
      },
      onDisconnect: () => {
        console.log('P2P 连接断开');
        setIsConnected(false);
        setHasClient(false);
      },
      onError: (error) => {
        console.error('WebRTC 错误:', error);
      }
    });

    // 连接到信令服务器
    connection.connect().then(() => {
      console.log('已连接到信令服务器');
    });

    webrtc.current = connection;

    return () => {
      connection.disconnect();
    };
  }, [roomId]);


  return (
    <div className="p-4">
      {/* 连接信息 */}
      {roomId && (
        <div className="space-y-4 mb-6">
          {/* 只有没有客户端连接时才显示二维码 */}
          {!hasClient && (
            <h2 className="text-lg font-semibold text-center">扫描二维码连接遥控器</h2>
          )}

          {/* 始终显示房间ID */}
          <div className="flex flex-col items-center space-y-2 mx-2">
            <div className="flex w-full flex-col items-center gap-2 border rounded-md px-2 py-1">
              <div>房间ID</div>
              <span className="text-2xl font-bold">{roomId}</span>
            </div>
            {!hasClient && (
              <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <QRCodeSVG value={'https://prompter.arsrna.cn/client?roomId=' + roomId} size={200} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 提词器内容区域 */}
      {hasClient && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-green-600">遥控器已连接</h2>
          </div>
          <Prompter {...promptProp} />
        </div>
      )}

      {/* 控制按钮 */}
      <div className="mt-6 space-y-4">
        <div className="flex justify-between items-center text-sm">
          <Status color={isConnected ? "bg-green-400" : "bg-red-400"}>
            服务器{isConnected ? '正常' : '启动中'}
          </Status>

          <Status color={hasClient ? "bg-green-400" : "bg-red-400"}>
            {hasClient ? '已连接' : '未连接'}遥控器
          </Status>
        </div>
      </div>
    </div>
  );
}

function Status({ color, children }: PropsWithChildren<{
  color: string
}>) {
  return <div className={"flex gap-1 items-center"}>
    <span className={`rounded-full w-2 h-2 ${color}`} />
    <span>{children}</span>
  </div>
}

