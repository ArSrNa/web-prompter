"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useZxing } from "react-zxing";
import { io, Socket } from "socket.io-client";

export default function BarcodeScanner() {
    const [result, setResult] = useState<string | null>(null);
    const [roomId, setRoomId] = useState('');
    const socket = useRef<Socket | null>(null);

    useEffect(() => {
        if (!socket.current) return;
        socket.current.on('connection', () => {
            socket.current.on('changeValue', (data) => {
                console.log(data);
                setResult('changeValue ' + data)
            });
        })
    }, [socket])

    const {
        ref,
        torch: { on, off, isOn, isAvailable },
    } = useZxing({
        onDecodeResult(result) {
            setResult(result.getText());
            setRoomId(result.getText())
        },
    });

    return (
        <>
            <label>输入房间号</label><input value={roomId} onChange={(e) => setRoomId(e.target.value)} />
            {isAvailable ? (
                <button onClick={() => (isOn ? off() : on())}>
                    {isOn ? "Turn off" : "Turn on"} torch
                </button>
            ) : (
                <strong>Unfortunately, torch is not available on this device.</strong>
            )}
            <Button onClick={() => {
                if (result === null) return;
                if (socket.current) {
                    socket.current.disconnect()
                }
                socket.current = io({
                    query: {
                        "roomId": result
                    },
                    autoConnect: true,
                    transports: ['websocket'],
                });
            }}
                disabled={!roomId}
            >连接</Button>
            <video ref={ref} />
            <p>
                <span>Last result:</span>
                <span>{result}</span>
            </p>
        </>
    );
};