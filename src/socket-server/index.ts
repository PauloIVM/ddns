import * as http from "http";
import { Crypto } from "../crypto";
import { Logger } from "../types";
import { Server, Socket } from "socket.io";
import { SocketStorer } from "../sockets-storer";


export class SocketServer {
    private token: string;
    private cripto: Crypto;
    private availableHosts: string[];
    private socketServer: Server;
    private socketStorer: SocketStorer;
    private logger: Logger;

    constructor(
        token: string,
        logger: Logger,
        httpServer: http.Server,
        cripto: Crypto,
        socketStorer: SocketStorer,
        availableHosts: string[],
        maxHttpBufferSize: number = 1e6
    ) {
        this.token = token;
        this.availableHosts = availableHosts;
        this.socketStorer = socketStorer;
        this.cripto = cripto;
        this.logger = logger;
        this.socketServer = new Server(httpServer, { maxHttpBufferSize });
    }

    listen() {
        this.socketServer.use(this.authSocketConnection.bind(this));
        this.socketServer.on("connection", this.handleSocketConnection.bind(this));
    }

    private authSocketConnection(socket: Socket, next: (err?: any) => void) {
        try {
            if (!this.validateSocketToken(socket.handshake.query.token as string)) throw new Error();
            next();
        } catch (error) {
            this.logger.error(`Unauthorized socket trying to connect: ${socket.id}`)
            next(new Error("Authentication error"));
        }
    }

    private validateSocketToken(token: string): boolean {
        return this.cripto.decrypt(token) === this.token;
    }

    private handleSocketConnection(socket: Socket) {
        socket.on("listen-host", (host: Buffer) => this.handleListenHost(socket, host));
        socket.on("disconnect", () => this.handleDisconnect(socket));
    }

    private handleListenHost(socket: Socket, hostBuffer: Buffer) {
        const host = hostBuffer.toString();
        if (!this.availableHosts.includes(host)) {
            this.handleInvalidHostConnection(socket, `No such host to connect, failed to: ${socket.id}`);
            return;
        }
        if (!this.socketStorer.add(host, socket)) {
            this.handleInvalidHostConnection(socket, `Host already has a connection, failed to: ${socket.id}`);
            return;
        }
        this.logger.log(`Client ${socket.id} connected on ${host}`);
    }

    private handleInvalidHostConnection(socket: Socket, message: string) {
        socket.disconnect();
        this.logger.warn(message);
    }

    private handleDisconnect(socket: Socket) {
        this.logger.log(`Client ${socket.id} disconnected from ${this.socketStorer.remove(socket)}`);
    }
}
