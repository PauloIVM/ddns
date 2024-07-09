import * as http from "http";
import { Server } from "socket.io";
import { Crypto } from "../domain/crypto";
import { ILogger } from "../domain/ports/logger";
import { ISocket } from "../domain/ports/socket";
import { SocketsManager } from "../domain/sockets-manager";
import { SocketIOAdapter } from "./adapters/socket-io-adapter";


export class SocketServer {
    private token: string;
    private crypto: Crypto;
    private availableHosts: string[];
    private socketServer: Server;
    private socketsManager: SocketsManager;
    private logger: ILogger;

    constructor(
        token: string,
        logger: ILogger,
        httpServer: http.Server,
        crypto: Crypto,
        socketsManager: SocketsManager,
        availableHosts: string[],
        maxHttpBufferSize: number = 1e6
    ) {
        this.token = token;
        this.availableHosts = availableHosts;
        this.socketsManager = socketsManager;
        this.crypto = crypto;
        this.logger = logger;
        this.socketServer = new Server(httpServer, { maxHttpBufferSize });
    }

    listen() {
        this.socketServer.use((s, next: (err?: any) => void) => {
            const socket = new SocketIOAdapter(s);
            try {
                if (!this.validateSocketToken(socket.getToken())) throw new Error();
                next();
            } catch (error) {
                this.logger.error(`Unauthorized socket trying to connect: ${socket.getId()}`)
                next(new Error("Authentication error"));
            }
        });
        this.socketServer.on("connection", (s) => {
            const socket = new SocketIOAdapter(s);
            socket.addListenner("listen-host", (host: Buffer) => this.handleListenHost(socket, host));
            socket.addListenner("disconnect", () => this.handleDisconnect(socket));
        });
    }

    private validateSocketToken(token: string): boolean {
        return this.crypto.decrypt(token) === this.token;
    }

    private handleListenHost(socket: ISocket, hostBuffer: Buffer) {
        const host = hostBuffer.toString();
        if (!this.availableHosts.includes(host)) {
            this.handleInvalidHostConnection(socket, `No such host to connect, failed to: ${socket.getId()}`);
            return;
        }
        if (!this.socketsManager.add(host, socket)) {
            this.handleInvalidHostConnection(socket, `Host already has a connection, failed to: ${socket.getId()}`);
            return;
        }
        this.logger.log(`Client ${socket.getId()} connected on ${host}`);
    }

    private handleInvalidHostConnection(socket: ISocket, message: string) {
        socket.disconnect();
        this.logger.warn(message);
    }

    private handleDisconnect(socket: ISocket) {
        this.logger.log(`Client ${socket.getId()} disconnected from ${this.socketsManager.remove(socket)}`);
    }
}
