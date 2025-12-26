"use client";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Textarea } from "@/components/ui/textarea";
import { newConnection } from "@/lib/socket";
import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { Socket } from "socket.io-client";
import { useAtom } from 'jotai';
import { persistentPromptPropAtom } from '@/lib/atoms';
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function ClientComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [msg, setMsg] = useState<string | null>(null);
    const [roomId, setRoomId] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);

    const [promptProp, setPromptProp] = useAtom(persistentPromptPropAtom);

    const contentLength = useMemo(() => {
        return promptProp.content.split('\n').length
    }, [promptProp.content])

    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const urlRoomId = searchParams.get('roomId');
        if (urlRoomId) {
            setRoomId(urlRoomId);
            if (!socket) {
                setSocket(newConnection(urlRoomId));
            }
        }
    }, [searchParams]);

    useEffect(() => {
        if (!socket) return;

        socket.on("connect", () => {
            console.log('遥控器连接成功');
            socket?.emit('prop_change', promptProp);
        });

        socket.on("disconnect", () => {
            console.log('遥控器连接断开');
            setSocket(null);
        });

        // 有用户加入房间
        socket.on('user_join', (data) => {
            console.log('系统提示', data);
        });

        // 用户离开房间
        socket.on('user_leave', (data) => {
            setSocket(null);
            router.push(pathname);
        });


        socket.on('receive_group_msg', (data) => {
            setMsg(JSON.stringify(data))
        })

        return () => {
            if (socket) socket.disconnect()
            // 清理滚动定时器
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
            }
        }
    }, [socket]);


    useEffect(() => {
        socket?.emit('prop_change', promptProp);
    }, [promptProp]);

    return (
        <div>
            {/* 连接部分 */}
            {!socket && (
                <div className="w-full flex flex-col gap-4 items-center justify-center">
                    <h1 className="text-lg font-semibold text-center">连接提词器</h1>
                    <InputOTP value={roomId} onChange={setRoomId} maxLength={6} onComplete={() => {
                        if (roomId.length === 6) {
                            router.push(`${pathname}?roomId=${roomId}`);
                        }
                    }}>
                        <InputOTPGroup>
                            {new Array(6).fill(0).map((_, i) => <InputOTPSlot index={i} key={'otp' + i} />)}
                        </InputOTPGroup>
                    </InputOTP>
                    <Button onClick={() => {
                        if (roomId.length === 6) {
                            router.push(`${pathname}?roomId=${roomId}`);
                        }
                    }}>连接</Button>
                </div>
            )}

            {/* 提词器控制部分 */}
            {socket && (
                <div className="mx-10 flex flex-col gap-4 items-center justify-center">
                    <Card className="w-full">
                        <CardHeader>
                            <CardTitle>连接信息</CardTitle>
                            <CardDescription>房间号：{roomId}</CardDescription>
                            <CardAction>
                                <Button
                                    onClick={() => {
                                        socket.disconnect();
                                    }}
                                    variant="outline"
                                >
                                    断开连接
                                </Button>
                            </CardAction>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Textarea
                                className="resize-none w-auto! h-50"
                                value={promptProp.content}
                                onChange={(e) => setPromptProp({
                                    ...promptProp,
                                    content: e.target.value
                                })}
                                placeholder="输入提词内容..."
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div className="border px-2 py-1 rounded-md flex flex-col items-center">
                                    <div>当前行</div>
                                    <span className="text-green-500 font-bold text-2xl">{promptProp.currentLine}</span>
                                </div>
                                <div className="border px-2 py-1 rounded-md flex flex-col items-center">
                                    <div>字体大小</div>
                                    <span className="text-green-500 font-bold text-2xl">{promptProp.fontSize}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button className="h-full" onClick={() => {
                                    setPromptProp({
                                        ...promptProp,
                                        fontSize: promptProp.fontSize + 10
                                    })
                                }}>字体 +</Button>
                                <Button className="h-full" onClick={() => {
                                    setPromptProp({
                                        ...promptProp,
                                        fontSize: promptProp.fontSize - 10
                                    })
                                }}>字体 -</Button>
                            </div>
                            <div className="grid grid-cols-2 h-30 gap-2">
                                <Button className="h-full" onClick={() => {
                                    setPromptProp({
                                        ...promptProp,
                                        currentLine: Math.max(0, promptProp.currentLine - 1)
                                    })
                                }}>▲ 上一行</Button>
                                <Button className="h-full" onClick={() => {
                                    setPromptProp({
                                        ...promptProp,
                                        currentLine: Math.min(contentLength - 1, promptProp.currentLine + 1)
                                    })
                                }}>▼ 下一行</Button>
                            </div>
                            <Button onClick={() => {
                                setPromptProp({
                                    ...promptProp,
                                    scaleX: promptProp.scaleX === -1 ? 1 : -1
                                })
                            }}>翻转</Button>
                        </CardContent>
                    </Card>
                    {/* 消息显示 */}
                    {msg && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            收到消息: {msg}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Client() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ClientComponent />
        </Suspense>
    );
};