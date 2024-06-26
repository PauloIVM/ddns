import { Server } from "socket.io";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// TODO: Mover isso para "exemples"
const PORT = 3000;
const TOKEN = "my_super_token";
const HOSTS = {
    [`server-a.localhost`]: { socket: null },
    [`server-b.localhost`]: { socket: null },
    [`server-c.localhost`]: { socket: null },
};

io.use((socket, next) => {
    // TODO: Usar sockets seguros (TLS/SSL) para criptografar a comunicação entre os servidores
    if (socket.handshake.query.token === TOKEN) {
        console.log(`Socket ${socket.id} authenticated`);
        next();
    } else {
        console.log(`Failed to authenticate ${socket.id}`);
        next(new Error('Authentication error'));
    }
});

io.on("connection", (socket) => {
    socket.on("listen-host", (host) => {
        if (!HOSTS[host.toString()]) return;
        if (HOSTS[host.toString()].socket) {
            socket.disconnect();
            console.log(`Host already has a connection, failed to: ${socket.id}`);
            return;    
        }
        console.log(`Cliente conectado: ${socket.id}`);
        HOSTS[host.toString()] = { socket }
    });
    socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        Object.keys(HOSTS).forEach((hostname) => {
            if (HOSTS[hostname]?.socket?.id !== socket.id) return;
            HOSTS[hostname] = { socket: null };
        });
    });
});

app.use(async (req, res) => {
    const targetHost = req.hostname;
    if (!HOSTS[targetHost]) {
        res.status(502).send("No such HOST configured");
        return;
    }
    let targetSocket = HOSTS[targetHost]?.socket;
    console.log("target host: ", targetHost + req.path);
    if (!targetSocket) await retry(targetHost);
    targetSocket = HOSTS[targetHost]?.socket;
    if (!targetSocket) {
        res.status(502).send("No such HOST available");
        return;
    }
    const requestOptions = { method: req.method, headers: req.headers, url: req.url };
    let body = [];
    req.on("data", (chunk) => {
        body.push(chunk);
    }).on("end", () => {
        body = Buffer.concat(body).toString();
        targetSocket.emit("httpRequest", requestOptions, body, (responseOptions, responseBody) => {
            res.writeHead(responseOptions.statusCode, responseOptions.headers);
            res.end(responseBody);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

async function retry(targetHost, count = 60) {
    if (HOSTS[targetHost]?.socket) return;
    if (count === 1) return;
    await sleep(1000);
    console.log(`Retries count: ${count}`);
    await retry(targetHost, count - 1); 
}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
