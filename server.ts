import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
// const hostname = "localhost";
const port = process.env.PORT || 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, port: Number(port) });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handler);

    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        const roomId = socket.handshake.query['roomId']?.toString();
        console.log(roomId)
        if (!roomId) {
            console.log('roomId is empty')
            return socket.disconnect(true);
        }
        console.log('socket', socket.id)
        socket.join(roomId);

        socket.on('changeValue', (v) => {
            console.log('getmsg', v)
            io.emit('changeValue', v)
        })
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