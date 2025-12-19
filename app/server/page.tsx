"use client";

import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { Socket } from "socket.io-client";
import { uuid } from "@/utils/uuid";
import { newConnection } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useImmer } from "use-immer";
import Prompter from "@/components/prompter";



export default function Server() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [hasClient, setHasClient] = useState(false);
  const socket = useRef<Socket | null>(null);
  const [promptProp, setPromptProp] = useImmer({
    fontSize: 80,
    currentLine: 0,
    content: ""
  })

  useEffect(() => {
    // 在客户端挂载后生成 roomId
    setTimeout(() => {
      setRoomId(uuid());
    }, 0);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    socket.current = newConnection(roomId);

    // 有用户加入房间
    socket.current.on('user_join', (data) => {
      console.log('系统提示', data.message, 'system');
      setHasClient(true);
    });

    // 用户离开房间
    socket.current.on('user_leave', (data) => {
      console.log('系统提示', data.message, 'system');
      setHasClient(false);
    });

    if (socket.current.connected) {
      onConnect();
    }

    function onConnect() {
      if (!socket.current) return;
      setIsConnected(true);
      socket.current.on('receive_group_msg', (data) => {
        console.log('receive_group_msg', data)
      })

      // 接收滚动控制
      socket.current.on('prop_updated', (data) => {
        // console.log('prop_updated', data);
        setPromptProp(data.data)
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setHasClient(false);
    }

    socket.current.on("connect", onConnect);
    socket.current.on("disconnect", onDisconnect);

    return () => {
      if (socket.current) {
        socket.current.off("connect", onConnect);
        socket.current.off("disconnect", onDisconnect);
      };
    }
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
          <div className="flex flex-col items-center space-y-2">
            <div className="flex w-full flex-col items-center gap-2 border rounded-md px-2 py-1">
              <div>房间ID</div>
              <span className="text-2xl font-bold">{roomId}</span>
            </div>
            {!hasClient && (
              <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <QRCodeSVG value={roomId} size={200} />
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

