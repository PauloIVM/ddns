import { Server } from "socket.io";
import express from "express";
import http from "http";

export class TunnelServer {
    constructor({
        availableHosts,
        token,
        port,
        socketTimeout,
        httpTimeout,
        logger,
    } = {}) {
        if (!port || !availableHosts) throw new Error("Port and Hosts are required");
        this.port = port;
        this.socketTimeout = Number(socketTimeout) || 60000;
        this.httpTimeout = Number(httpTimeout) || 60000;
        this.token = token;
        this.hosts = availableHosts.reduce((acc, curr) => {
            acc[curr] = { socket: null };
            return acc;
        }, {});
        this.httpServer = express();
        this.server = http.createServer(this.httpServer);
        this.socketServer = new Server(this.server);
        this.logger = logger || { error: console.error, warn: console.warn, log: console.log };
    }

    listen(cb) {
        if (this.token) this.socketServer.use(this.authSocketConnection.bind(this));
        this.socketServer.on("connection", this.handleSocketConnection.bind(this));
        this.httpServer.use(this.handleHttpTimeout.bind(this));
        this.httpServer.use(this.handleHttpRequest.bind(this));
        this.server.listen(this.port, cb);
    }

    authSocketConnection(socket, next) {
        // TODO: Usar sockets seguros (TLS/SSL) para criptografar a comunicação entre os servidores
        if (socket.handshake.query.token !== this.token) {
            this.logger.error(`Unauthorized socket trying to connect: ${socket.id} - ${socket.ip}`)
            next(new Error("Authentication error"));
            return;
        };
        next();
    }

    handleSocketConnection(socket) {
        socket.on("listen-host", (host) => {
            if (!this.hosts[host.toString()]) {
                socket.disconnect();
                this.logger.warn(`No such host to connect, failed to: ${socket.id}`);
                return;   
            }
            if (this.hosts[host.toString()].socket) {
                socket.disconnect();
                this.logger.warn(`Host already has a connection, failed to: ${socket.id}`);
                return;    
            }
            this.logger.log(`Client ${socket.id} connected on ${host.toString()}`);
            this.hosts[host.toString()] = { socket }
        });
        socket.on("disconnect", () => {
            Object.keys(this.hosts).forEach((hostname) => {
                if (this.hosts[hostname]?.socket?.id !== socket.id) return;
                this.logger.log(`Client ${socket.id} disconnected from ${hostname}`);
                this.hosts[hostname] = { socket: null };
            });
        });
    }

    async handleHttpRequest(req, res) {
        const targetHost = req.hostname;
        if (!this.hosts[targetHost] && !res.headersSent) {
            res.status(502).send("No such HOST configured");
            return;
        }
        let targetSocket = this.hosts[targetHost]?.socket;
        if (!targetSocket) await this.retry(targetHost);
        targetSocket = this.hosts[targetHost]?.socket;
        if (!targetSocket && !res.headersSent) {
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
                if (res.headersSent) return;
                res.writeHead(responseOptions.statusCode, responseOptions.headers);
                res.end(responseBody);
            });
        });
    }

    handleHttpTimeout(_, res, next) {
        const timeout = setTimeout(() => {
            if (!res.headersSent) res.status(408).send("Request Timeout");
        }, this.httpTimeout);
        res.on("finish", () => timeout && clearTimeout(timeout));
        res.on("close", () => timeout && clearTimeout(timeout));
        next();
    };

    async retry(targetHost, initiatedAt = new Date()) {
        this.logger.warn(`Lost socket connection to host ${targetHost}, waiting for reconnection..`);
        if (this.socketTimeout < Date.now() - initiatedAt) return;
        if (this.hosts[targetHost]?.socket) return;
        await this.sleep(1000);
        await this.retry(targetHost, initiatedAt); 
    }
    
    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
