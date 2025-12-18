"use client";
import { Button } from "@/components/ui/button";
import { newConnection } from "@/lib/socket";
import { useEffect, useRef, useState } from "react";
import { useZxing } from "react-zxing";
import { io, Socket } from "socket.io-client";

export default function BarcodeScanner() {
    const [result, setResult] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [roomId, setRoomId] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (!socket) return;
        socket.on("connection", (socket) => {
            console.log('连接成功')
        });

        // 有用户加入房间
        socket.on('user_join', (data) => {
            console.log('系统提示', data.message);
        });

        socket.on('receive_group_msg', (data) => {
            setMsg(JSON.stringify(data))
        })

        return () => {
            if (socket) socket.disconnect()
        }
    }, [socket])

    // const {
    //     ref,
    //     torch: { on, off, isOn, isAvailable },
    // } = useZxing({
    //     onDecodeResult(result) {
    //         setResult(result.getText());
    //         setRoomId(result.getText())
    //     },
    // });

    return (
        <>
            <label>输入房间号</label><input value={roomId} onChange={(e) => setRoomId(e.target.value)} />
            {/* {isAvailable ? (
                <button onClick={() => (isOn ? off() : on())}>
                    {isOn ? "Turn off" : "Turn on"} torch
                </button>
            ) : (
                <strong>Unfortunately, torch is not available on this device.</strong>
            )} */}
            <Button onClick={() => {
                // if (socket) {
                //     socket.disconnect()
                // }
                setSocket(newConnection(roomId))
            }}
                disabled={!roomId}
            >连接</Button>
            {/* <video ref={ref} /> */}
            <span>Last result:</span>
            <span>{result}</span>
            <div>msg: {msg}</div>
        </>
    );
};