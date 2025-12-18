import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, port: Number(port), hostname: '0.0.0.0' });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    // const httpServer = createServer(handler);
    const httpServer = createServer(handler);
    const io = new Server(httpServer, {
        // options
        cors: {
            origin: "*",
            methods: "*",
            allowedHeaders: "*",
            credentials: true
        },
        transports: ['polling', "webtransport"]
    });


    io.on("connection", (socket) => {
        const roomId = socket.handshake.query['roomId']?.toString();
        console.log(roomId)
        if (!roomId) {
            console.log('roomId is empty')
            return socket.disconnect(true);
        }
        console.log('socket', socket.id, roomId)
        socket.join(roomId);

        // 通知房间内所有人（除自己）：有新用户加入
        socket.to(roomId).emit('user_join', {
            userId: socket.id,
            message: `用户 ${socket.id} 加入了房间 ${roomId}`
        });

        // 2. 客户端发送群聊消息
        socket.on('send_group_msg', (data) => {
            // 向房间内所有人发送消息（包括自己）
            io.to(roomId).emit('receive_group_msg', {
                data,
                time: new Date().toLocaleTimeString(),
                userId: socket.id
            });
        });

    });



    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://localhost:${port}`);
        });
});