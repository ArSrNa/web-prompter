"use client";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useAtom } from 'jotai';
import { persistentPromptPropAtom } from '@/lib/atoms';
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PrompterWebRTCConnection } from "@/lib/webrtc-prompter";

function ClientComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [msg, setMsg] = useState<string | null>(null);
    const [roomId, setRoomId] = useState('');
    const [webrtc, setWebrtc] = useState<PrompterWebRTCConnection | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const [promptProp, setPromptProp] = useAtom(persistentPromptPropAtom);

    const contentLength = useMemo(() => {
        return promptProp.content.split('\n').length
    }, [promptProp.content])

    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const urlRoomId = searchParams.get('roomId');
        if (urlRoomId && !webrtc) {
            setRoomId(urlRoomId);

            // 创建 WebRTC 连接（客户端作为接收者）
            const connection = new PrompterWebRTCConnection({
                roomId: urlRoomId,
                signalingUrl: process.env.NEXT_PUBLIC_SIGNALING_URL ||
                              (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:9000'),
                isInitiator: false,
                onConnect: () => {
                    console.log('遥控器 P2P 连接成功');
                    setIsConnected(true);
                    // 连接成功后发送当前属性
                    connection.sendPropChange(promptProp);
                },
                onDisconnect: () => {
                    console.log('遥控器 P2P 连接断开');
                    setIsConnected(false);
                    setWebrtc(null);
                    router.push(pathname);
                },
                onError: (error) => {
                    console.error('WebRTC 错误:', error);
                }
            });

            // 连接到信令服务器
            connection.connect().then(() => {
                console.log('遥控器已连接到信令服务器');
            });

            setWebrtc(connection);
        }

        return () => {
            // 清理函数
        }
    }, [searchParams]);

    useEffect(() => {
        return () => {
            // 清理滚动定时器
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
            }
            // 断开 WebRTC 连接
            webrtc?.disconnect();
        }
    }, []);

    // 当属性变化时，通过 WebRTC 发送
    useEffect(() => {
        if (webrtc && isConnected) {
            webrtc.sendPropChange(promptProp);
        }
    }, [promptProp, webrtc, isConnected]);

    return (
        <div>
            {/* 连接部分 */}
            {!webrtc && (
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
            {webrtc && isConnected && (
                <div className="mx-10 flex flex-col gap-4 items-center justify-center">
                    <Card className="w-full">
                        <CardHeader>
                            <CardTitle>连接信息</CardTitle>
                            <CardDescription>房间号：{roomId}</CardDescription>
                            <CardAction>
                                <Button
                                    onClick={() => {
                                        webrtc?.disconnect();
                                        setWebrtc(null);
                                        setIsConnected(false);
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