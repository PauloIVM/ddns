import * as http from "http";
import { Crypto } from "../crypto";
import { Logger } from "../types";
import { SocketServer } from "../socket-server";
import { SocketStorer } from "../sockets-storer";
import { Tunnel } from "../tunnel";

interface MyGrokServerConfig {
    availableHosts: string[];
    port: number;
    token?: string;
    secretKey?: string;
    reconnectionTimeout?: number;
    logger?: Logger;
    maxHttpBufferSize?: number
}

export class MyGrokServer {
    private port: number;
    private cripto: Crypto;
    private availableHosts: string[];
    private server: http.Server;
    private socketServer: SocketServer;
    private socketStorer: SocketStorer;
    private tunnel: Tunnel;

    constructor({
        availableHosts,
        token = "default_token",
        port,
        reconnectionTimeout,
        logger = { error: console.error, warn: console.warn, log: console.log },
        secretKey,
        maxHttpBufferSize
    }: MyGrokServerConfig) {
        if (!port || !availableHosts) throw new Error("Port and Hosts are required");
        this.port = port;
        this.availableHosts = availableHosts;
        this.cripto = new Crypto(secretKey);
        this.server = http.createServer(this.handleHttp.bind(this));
        this.tunnel = new Tunnel(this.cripto);
        this.socketStorer = new SocketStorer(logger, reconnectionTimeout || 60000);
        this.socketServer = new SocketServer(
            token,
            logger,
            this.server,
            this.cripto,
            this.socketStorer,
            this.availableHosts,
            maxHttpBufferSize
        );
    }

    listen(cb?: Function) {
        this.socketServer.listen();
        this.server.listen(this.port, cb);
    }

    private handleHttp(req: http.IncomingMessage, res: http.ServerResponse) {
        try {
            this.handleHttpRequest(req, res);
        } catch (error) {
            res.writeHead(502);
            res.end("Internal server error");
        }
    }

    private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const host = req.headers.host?.split(":")[0];
        if (!this.availableHosts.includes(host)) {
            res.writeHead(502);
            res.end(`No such ${host} HOST configured`);
            return;
        }
        const socket = await this.socketStorer.get(host);
        if (!socket) {
            res.writeHead(502);
            res.end("No such HOST available");
            return;
        }
        this.tunnel.emitHttpRequest(socket, req, res);
    }
}
