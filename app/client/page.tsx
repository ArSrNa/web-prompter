"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { newConnection } from "@/lib/socket";
import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";

export default function BarcodeScanner() {
    const [msg, setMsg] = useState<string | null>(null);
    const [roomId, setRoomId] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [content, setContent] = useState<string>("");
    const [currentLine, setCurrentLine] = useState(0);

    const [isEditing, setIsEditing] = useState(false);
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on("connect", () => {
            console.log('遥控器连接成功');
        });

        socket.on("disconnect", () => {
            console.log('遥控器连接断开');
        });

        // 有用户加入房间
        socket.on('user_join', (data) => {
            console.log('系统提示', data.message);
        });

        // 用户离开房间
        socket.on('user_leave', (data) => {
            console.log('系统提示', data.message);
        });

        // 接收内容更新
        socket.on('content_updated', (data) => {
            console.log('content_updated', data);
            setContent(data.content);
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
        socket?.emit('scroll_control', currentLine);
    }, [currentLine])

    // 处理内容更新
    const handleContentUpdate = (newContent: string) => {
        setContent(newContent);
        socket?.emit('update_content', { content: newContent });
    };


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
        <div className="p-4 max-w-md mx-auto space-y-4">
            {/* 连接部分 */}
            {!socket && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-center">连接提词器</h2>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-600">输入房间号</label>
                        <input
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="请输入房间ID"
                        />
                    </div>
                    <Button
                        onClick={() => setSocket(newConnection(roomId))}
                        disabled={!roomId}
                        className="w-full"
                    >
                        连接
                    </Button>
                </div>
            )}

            {/* 提词器控制部分 */}
            {socket && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-green-600">已连接</h2>
                        <Button
                            onClick={() => {
                                socket.disconnect();
                                setSocket(null);
                            }}
                            variant="outline"
                            size="sm"
                        >
                            断开连接
                        </Button>
                    </div>

                    {/* 内容编辑区域 */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">提词内容</label>
                            <Button
                                onClick={() => {
                                    if (isEditing) {
                                        handleContentUpdate(content);
                                    }
                                    setIsEditing(!isEditing);
                                }}
                                variant={isEditing ? "default" : "outline"}
                                size="sm"
                            >
                                {isEditing ? "保存" : "编辑"}
                            </Button>
                        </div>
                        {isEditing ? (
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="输入提词内容..."
                            />
                        ) : (
                            <div className="w-full h-32 border border-gray-200 rounded-lg overflow-y-auto text-sm whitespace-pre-wrap">
                                {content || <span className="text-gray-500">暂无内容</span>}
                            </div>
                        )}
                    </div>

                    {/* 滚动控制 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">滚动控制</label>
                        <div>当前行</div>
                        <div className="grid grid-cols-3 gap-2">
                            <Button onClick={() => {
                                setCurrentLine(currentLine <= 0 ? 0 : currentLine - 1)
                            }}>▲</Button>
                            <Button onClick={() => {
                                setCurrentLine(currentLine >= content.split('\n').length ? content.split('\n').length : currentLine + 1)
                            }}>▼</Button>
                        </div>
                    </div>

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
};