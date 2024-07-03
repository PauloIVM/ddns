import * as http from "http";
import { Crypto } from "../crypto";
import { ResPayload, ReqPayload, Logger } from "../types";
import { Socket } from "socket.io";
import { SocketServer } from "../socket-server";
import { SocketStorer } from "../sockets-storer";

interface MyGrokServerConfig {
    availableHosts: string[];
    port: number;
    token?: string;
    secretKey?: string;
    reconnectionTimeout?: number;
    logger?: Logger;
}

export class MyGrokServer {
    private port: number;
    private cripto: Crypto;
    private availableHosts: string[];
    private server: http.Server;
    private socketServer: SocketServer;
    private socketStorer: SocketStorer;

    constructor({
        availableHosts,
        token = "default_token",
        port,
        reconnectionTimeout,
        logger = { error: console.error, warn: console.warn, log: console.log },
        secretKey
    }: MyGrokServerConfig) {
        if (!port || !availableHosts) throw new Error("Port and Hosts are required");
        this.port = port;
        this.availableHosts = availableHosts;
        this.cripto = new Crypto(secretKey);
        this.server = http.createServer(this.handleHttp.bind(this));
        this.socketStorer = new SocketStorer(logger, reconnectionTimeout || 60000);
        this.socketServer = new SocketServer(
            token,
            logger,
            this.server,
            this.cripto,
            this.socketStorer,
            this.availableHosts,
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
        const body = await this.promisifyHttpReq(req);
        const resPayload = await this.emitHttpRequest(socket, req, body);
        res.writeHead(resPayload.statusCode || 200, resPayload.headers);
        res.end(resPayload.body);
    }

    private emitHttpRequest(socket: Socket, req: http.IncomingMessage, body: string): Promise<ResPayload> {
        return new Promise((resolve, reject) => {
            try {
                const reqPayload = this.cripto.encryptOb<ReqPayload>({
                    method: req.method,
                    headers: req.headers,
                    url: req.url,
                    body
                });
                socket.emit("http-request", reqPayload, (resPayloadEncripted: string) => {
                    const resPayload = this.cripto.decryptOb<ResPayload>(resPayloadEncripted);
                    resolve(resPayload);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // TODO: Support broadcasting a stream without grouping it all here. This can cause problems in
    //       large streams, such as media streams, etc. This may be difficult given the encryption.
    private promisifyHttpReq(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            const bodyChunks = [];
            req
                .on("data", (chunk) => { bodyChunks.push(chunk); })
                .on("end", () => { resolve(Buffer.concat(bodyChunks).toString()); })
                .on("error", (e) => reject(e));
        });
    }
}
