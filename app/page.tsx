'use client'
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter()
    return (
        <div className="flex flex-col items-center justify-center md:mx-20 sm:mx-5 h-full">
            <h1>根据类型进入</h1>

            <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto">
                {/* 第一行：遥控器和提词器 */}
                <div className="grid gap-5 md:grid-cols-2 sm:grid-cols-1">
                    <div className="flex flex-col w-full h-60 justify-center items-center border rounded-md cursor-pointer" onClick={() => router.push('client')}>
                        <h3>遥控器</h3>
                        <span>连接提词器使用</span>
                    </div>

                    <div className="flex flex-col w-full h-60 justify-center items-center border rounded-md cursor-pointer" onClick={() => router.push('server')}>
                        <h3>提词器</h3>
                        <span>显示提词内容</span>
                    </div>
                </div>

                {/* 第二行：单机使用 */}
                <div className="w-full">
                    <div className="flex flex-col w-full h-60 justify-center items-center border rounded-md cursor-pointer" onClick={() => router.push('standalone')}>
                        <h3>单机使用</h3>
                        <span>本机直接使用</span>
                    </div>
                </div>
            </div>

            <div>

            </div>
        </div>
    );
}