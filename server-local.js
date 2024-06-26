const io = require("socket.io-client");
const http = require("http");
const express = require("express");

const SERVER_URL = "http://localhost:3000";
const LOCAL_PORT = 4000;

const socket = io(SERVER_URL);

socket.on("connect", () => {
    console.log("Conectado ao servidor cloud");
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

// TODO: Encerrar o server-local, fazer diversas requests com um query.name distinto, subir
//       novamente o server-local e ver se vai responder certinho pra todo mundo, sem nenhum
//       problema de concorrênia.
const PORT = 4000;
const app = express();
app.use("/", (req, res) => res.json({ message: `hello ${req.query["name"]}` }));
const server = http.createServer(app);
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
