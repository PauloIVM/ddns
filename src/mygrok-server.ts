import * as http from "http";
import { Crypto } from "./domain/crypto";
import { TunnelServer } from "./domain/tunnel-server";
import { ILogger } from "./domain/ports/logger";
import { IReqPayloadDTO } from "./domain/dtos/req-payload-dto";
import { SocketsManager } from "./domain/sockets-manager";
import { ConsoleLoggerAdapter } from "./infra/adapters/console-logger-adapter";
import { SocketServer } from "./infra/socket-server";

interface MyGrokServerConfig {
    availableHosts: string[];
    port: number;
    token?: string;
    secretKey?: string;
    reconnectionTimeout?: number;
    logger?: ILogger;
    maxHttpBufferSize?: number;
    encryptAll?: boolean;
}

export class MyGrokServer {
    private port: number;
    private crypto: Crypto;
    private availableHosts: string[];
    private server: http.Server;
    private socketServer: SocketServer;
    private socketsManager: SocketsManager;
    private encryptAll: boolean;

    constructor({
        availableHosts,
        token = "default_token",
        port,
        reconnectionTimeout,
        logger = new ConsoleLoggerAdapter(),
        secretKey,
        maxHttpBufferSize,
        encryptAll
    }: MyGrokServerConfig) {
        if (!port || !availableHosts) throw new Error("Port and Hosts are required");
        this.port = port;
        this.availableHosts = availableHosts;
        this.encryptAll = !!encryptAll;
        this.crypto = new Crypto(secretKey);
        this.server = http.createServer(this.handleHttp.bind(this));
        this.socketsManager = new SocketsManager(logger, reconnectionTimeout || 60000);
        this.socketServer = new SocketServer(
            token,
            logger,
            this.server,
            this.crypto,
            this.socketsManager,
            this.availableHosts,
            maxHttpBufferSize
        );
    }

    listen(cb?: Function) {
        this.socketServer.listen();
        this.server.listen(this.port, cb);
    }

    close(cb?: (err) => void) {
        this.server.close(cb);
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
        const socket = await this.socketsManager.get(host);
        if (!socket) {
            res.writeHead(502);
            res.end("No such HOST available");
            return;
        }
        const id = `${Math.floor(Math.random()*1e8)}${Date.now()}`;
        const payload: IReqPayloadDTO = {
            id,
            method: req.method,
            headers: req.headers,
            url: req.url
        };
        const tunnel = await TunnelServer.build(this.crypto, payload, socket, this.encryptAll);
        const destination = TunnelServer.buildDestination(res);
        req.pipe(tunnel).pipe(destination);
    }
}
