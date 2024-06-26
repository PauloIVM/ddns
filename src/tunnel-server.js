import { Server } from "socket.io";
import express from "express";
import http from "http";

export class TunnelServer {
    constructor({ availableHosts, token, port } = {}) {
        if (!port || !availableHosts) throw new Error("Port and Hosts are required");
        this.port = port;
        this.token = token;
        this.hosts = availableHosts.reduce((acc, curr) => {
            acc[curr] = { socket: null };
            return acc;
        }, {});
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server);
    }

    listen(cb) {
        if (this.token) this.io.use(this.authSocketConnection.bind(this));
        this.io.on("connection", this.handleSocketConnection.bind(this));
        this.app.use(this.handleRequest.bind(this));
        this.server.listen(this.port, cb);
    }

    authSocketConnection(socket, next) {
        // TODO: Usar sockets seguros (TLS/SSL) para criptografar a comunicação entre os servidores
        if (socket.handshake.query.token !== this.token) next(new Error("Authentication error"));
        next();
    }

    handleSocketConnection(socket) {
        socket.on("listen-host", (host) => {
            if (!this.hosts[host.toString()]) {
                socket.disconnect();
                console.log(`No such host to connect, failed to: ${socket.id}`);
                return;   
            }
            if (this.hosts[host.toString()].socket) {
                socket.disconnect();
                console.log(`Host already has a connection, failed to: ${socket.id}`);
                return;    
            }
            console.log(`Cliente conectado: ${socket.id}`);
            this.hosts[host.toString()] = { socket }
        });
        socket.on("disconnect", () => {
            console.log(`Cliente desconectado: ${socket.id}`);
            Object.keys(this.hosts).forEach((hostname) => {
                if (this.hosts[hostname]?.socket?.id !== socket.id) return;
                this.hosts[hostname] = { socket: null };
            });
        });
    }

    async handleRequest(req, res) {
        const targetHost = req.hostname;
        if (!this.hosts[targetHost]) {
            res.status(502).send("No such HOST configured");
            return;
        }
        let targetSocket = this.hosts[targetHost]?.socket;
        console.log("target host: ", targetHost + req.path);
        if (!targetSocket) await this.retry(targetHost);
        targetSocket = this.hosts[targetHost]?.socket;
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
    }

    async retry(targetHost, count = 60) {
        if (this.hosts[targetHost]?.socket) return;
        if (count === 1) return;
        await this.sleep(1000);
        console.log(`Retries count: ${count}`);
        await this.retry(targetHost, count - 1); 
    }
    
    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
