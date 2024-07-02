import * as http from "http";
import { Crypto } from "../crypto";
import { ResPayload } from "../types";
import { Server, Socket } from "socket.io";

interface TunnelServerConfig {
    availableHosts: string[];
    token: string;
    secretKey?: string;
    port: number;
    reconnectionTimeout?: number;
    logger?: {
        error: (msg: string) => void;
        warn: (msg: string) => void;
        log: (msg: string) => void;
    };
}

export class TunnelServer {
    private port: number;
    private reconnectionTimeout: number;
    private token: string;
    private cripto: Crypto;
    private hosts: { [host: string]: { socket?: Socket } };
    private server: http.Server;
    private socketServer: Server;
    private logger: TunnelServerConfig["logger"];

    constructor({
        availableHosts,
        token,
        port,
        reconnectionTimeout,
        logger,
        secretKey
    }: TunnelServerConfig) {
        if (!port || !availableHosts) throw new Error("Port and Hosts are required");
        this.port = port;
        this.reconnectionTimeout = reconnectionTimeout || 60000;
        this.token = token;
        this.hosts = availableHosts.reduce((acc, curr) => {
            acc[curr] = { socket: null };
            return acc;
        }, {});
        this.cripto = new Crypto(secretKey);
        this.server = http.createServer(this.handleHttpRequest.bind(this));
        this.socketServer = new Server(this.server);
        this.logger = logger || { error: console.error, warn: console.warn, log: console.log };
    }

    listen(cb?: Function) {
        if (this.token) this.socketServer.use(this.authSocketConnection.bind(this));
        this.socketServer.on("connection", this.handleSocketConnection.bind(this));
        this.server.listen(this.port, cb);
    }

    private authSocketConnection(socket: Socket, next: (err?: any) => void) {
        if (this.cripto.decrypt(socket.handshake.query.token as string) !== this.token) {
            this.logger.error(`Unauthorized socket trying to connect: ${socket.id}`)
            next(new Error("Authentication error"));
            return;
        };
        next();
    }

    private handleSocketConnection(socket: Socket) {
        socket.on("listen-host", (host: Buffer) => {
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

    private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const targetHost = req.headers.host?.split(":")[0];
        if (!this.hosts[targetHost]) {
            res.writeHead(502);
            res.end(`No such ${targetHost} HOST configured`);
            return;
        }
        let targetSocket = this.hosts[targetHost]?.socket;
        if (!targetSocket) await this.retry(targetHost);
        targetSocket = this.hosts[targetHost]?.socket;
        if (!targetSocket) {
            res.writeHead(502);
            res.end("No such HOST available");
            return;
        }
        // TODO: Ao invés de promisificar e juntar o body em um único array, enviar cada chunk em
        //       um 'emit' distinto. Daí a lib vai suportar streams (hoje vai dar problema se a stream
        //       for muito grande).
        const body = await this.promisifyHttpReq(req);
        const reqPayload = {
            method: req.method,
            headers: req.headers,
            url: req.url,
            body
        };
        targetSocket.emit("http-request", reqPayload, (resPayload: ResPayload) => {
            res.writeHead(resPayload.statusCode || 200, resPayload.headers);
            res.end(resPayload.body);
        });
    }

    private promisifyHttpReq(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            const bodyChunks = [];
            req
                .on("data", (chunk) => { bodyChunks.push(chunk); })
                .on("end", () => { resolve(Buffer.concat(bodyChunks).toString()); })
                .on("error", (e) => reject(e));
        });
    }

    private async retry(targetHost: string, initiatedAt = new Date()) {
        this.logger.warn(`Lost socket connection to host ${targetHost}, waiting for reconnection..`);
        if (this.reconnectionTimeout < Date.now() - initiatedAt.getTime()) return;
        if (this.hosts[targetHost]?.socket) return;
        await this.sleep(1000);
        await this.retry(targetHost, initiatedAt); 
    }
    
    private async sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
