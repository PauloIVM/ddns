import * as http from "http";
import { Crypto } from "../crypto";
import { Socket } from "socket.io";
import { TunnelEmitter } from "./emitter";
import { Socket as ClientSocket } from "socket.io-client";
import { ReqPayload } from "../types";
import { SocketIOAdapter } from "./socket-io-adapter";
import { TunnelReceiver, ClientConfig } from "./receiver";
import { SocketIOClientAdapter } from "./socket-io-client-adapter";

export class Tunnel {
    constructor(readonly cripto: Crypto) {}

    listenHttpRequests(socket: ClientSocket, configs: ClientConfig) {
        new TunnelReceiver(this.cripto, new SocketIOClientAdapter(socket)).listen(configs);
    }

    async createEmitter(socket: Socket, reqPayload: ReqPayload, res: http.ServerResponse): Promise<TunnelEmitter> {
        return TunnelEmitter.build(this.cripto, reqPayload, new SocketIOAdapter(socket), res);
    }
}
