const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

// TODO: Acho q n preciso de usar o express aqui...

const PORT = 3000;
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let clients = {};

io.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);
    clients[socket.id] = socket;
    socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        delete clients[socket.id];
    });
});

app.use((req, res) => {
    const targetSocketId = Object.keys(clients)[0];
    if (!targetSocketId) res.status(502).send("No clients available");
    const targetSocket = clients[targetSocketId];
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
