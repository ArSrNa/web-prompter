"use client";

import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { io, Socket } from "socket.io-client";
import { uuid } from "@/utils/uuid";
import { newConnection } from "@/lib/socket";
import { Button } from "@/components/ui/button";


export default function Server() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [roomId, setRoomId] = useState<string>("");
  const socket = useRef<Socket | null>(null)

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
    });

    if (socket.current.connected) {
      onConnect();
    }

    function onConnect() {
      if (!socket.current) return;
      setIsConnected(true);
      setTransport(socket.current.io.engine.transport.name);
      // socket.io.engine.on("upgrade", (transport) => {
      //   setTransport(transport.name);
      // });
      socket.current.on('receive_group_msg', (data) => {
        console.log('receive_group_msg', data)
      })
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
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
    <div>
      <label>ID：{roomId}</label>
      <div className="bg-white p-2">
        <QRCodeSVG value={roomId} />
      </div>

      <Button onClick={() => {
        socket.current?.emit('send_group_msg', 123)
      }}>value change</Button>

      <Status color={isConnected ? "bg-green-400" : "bg-red-400"}>
        服务器{isConnected ? '正常' : '启动中'}
      </Status>

      <Status color={isConnected ? "bg-green-400" : "bg-red-400"}>
        {isConnected ? '已连接' : '未连接'}客户端
      </Status>
      <p>Transport: {transport}</p>
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