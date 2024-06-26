import io from "socket.io-client";
import express from "express";
import http from "http";

// TODO: Mover isso para "exemples"
const SERVER_URL = "http://localhost:3000";
const LOCAL_PORT = 4000;
const TOKEN = "my_super_token";

const socket = io(SERVER_URL, {
    query: { token: TOKEN }
});

socket.on("connect", () => {
    console.log("Conectado ao servidor cloud");
    socket.emit("listen-host", "server-a.localhost");
});

socket.on("disconnect", () => {
    console.log("Desconectado do servidor cloud");
});

socket.on("httpRequest", (requestOptions, body, callback) => {
    const options = {
        hostname: "localhost",
        port: LOCAL_PORT,
        path: requestOptions.url,
        method: requestOptions.method,
        headers: requestOptions.headers
    };

    const req = http.request(options, (res) => {
        let responseBody = [];
        res.on("data", (chunk) => {
            responseBody.push(chunk);
        }).on("end", () => {
            responseBody = Buffer.concat(responseBody).toString();
            const responseOptions = {
                statusCode: res.statusCode,
                headers: res.headers
            };
            callback(responseOptions, responseBody);
        });
    });

    req.on("error", (e) => {
        console.error(`Problema com a requisição: ${e.message}`);
    });

    if (body) req.write(body);
    req.end();
});

// TODO: Mover isso para "exemples"
const PORT = LOCAL_PORT;
const app = express();
app.use("/", (req, res) => res.json({ message: `hello ${req.query["name"]}` }));
const server = http.createServer(app);
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
