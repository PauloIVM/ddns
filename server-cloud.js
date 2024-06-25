const http = require("http");
const httpProxy = require("http-proxy");
const WebSocket = require("ws");

let targetIP = "";

const proxy = httpProxy.createProxyServer({});
const server = http.createServer(async (req, res) => {
    if (!targetIP) await retry();
    if (!targetIP) {
        res.writeHead(500);
        res.end("Internal server error.");
    };
    proxy.web(req, res, { target: `http://${targetIP}` });
});
server.listen(8080, () => {
    console.log("Server listening on port 8080");
});

const wss = new WebSocket.Server({ port: 3005 });
wss.on("connection", (socket) => {
    socket.on("message", (message) => {
        console.log("Received new IP: ", message.toString());
        targetIP = message.toString();
    });
    socket.on("close", () => {
        console.log("Cliente desconectado");
        targetIP = null;
    });
});

async function retry(count = 60) {
    if (targetIP) return;
    if (count === 1) return;
    await sleep(1000);
    console.log(`Retries count: ${count}`);
    await retry(count - 1); 
}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
