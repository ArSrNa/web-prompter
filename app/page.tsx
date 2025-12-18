'use client'
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter()
    return (
        <div className="flex flex-col items-center justify-center md:mx-20 sm:mx-5 h-full">
            <h1>根据类型进入</h1>

            <div className="grid gap-5 md:grid-cols-2 sm:grid-cols-1 w-full">
                <div className="flex flex-col w-full h-60 justify-center items-center border rounded-md cursor-pointer" onClick={() => router.push('client')}>
                    <h3>客户端</h3>
                    <span>连接提词器使用</span>
                </div>

                <div className="flex flex-col w-full h-60 justify-center items-center border rounded-md cursor-pointer" onClick={() => router.push('server')}>
                    <h3>服务端</h3>
                    <span>提词器</span>
                </div>
            </div>

            <div>

            </div>
        </div>
    );
}