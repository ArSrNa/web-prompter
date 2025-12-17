'use client'
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter()
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <h1>根据类型进入</h1>

            <div className="grid gap-2 grid-cols-2" >
                <div className="flex w-100 h-80 justify-center items-center border rounded-md cursor-pointer" onClick={() => router.push('client')}>
                    <h3>客户端</h3>
                    <span>连接提词器使用</span>
                </div>

                <div className="flex w-100 h-80 justify-center items-center border rounded-md cursor-pointer" onClick={() => router.push('server')}>
                    <h3>服务端</h3>
                    <span>提词器</span>
                </div>
            </div>

            <div>

            </div>
        </div>
    );
}