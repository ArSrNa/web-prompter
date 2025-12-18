import { io } from "socket.io-client";

export function newConnection(roomId: string) {
    return io({
        query: { roomId },
        autoConnect: true,
        transports: ['polling'],
        timeout: 10000,
        // 重连配置
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
}