import * as http from "http";
import { Crypto } from "../crypto";
import { ResPayload, ReqPayload } from "../types";
import { ISocket } from "./socket";

export interface ClientConfig {
    hostname: string;
    port: number;
}

export class TunnelReceiver {
    constructor(readonly cripto: Crypto, readonly socket: ISocket) {}

    listen({ hostname, port }: ClientConfig) {
        this.socket.addListennerWithAck("http-request-init", this.handleRequestInit.bind(
            this,
            hostname,
            port
        ));
    }

    private handleRequestInit(hostname: string, port: number, reqPayloadEncrypted: string) {
        const { url, method, id, headers } = this.cripto.decryptOb<ReqPayload>(reqPayloadEncrypted);
        const options = { hostname, port, path: url, method, headers };
        const clientReq = http.request(options, this.handleClientRequest.bind(this, id));
        clientReq.on("error", this.socket.emit.bind(this.socket, `http-response-error-${id}`));
        this.socket.addListenner(`http-request-chunk-${id}`, (c) => clientReq.write(c));
        this.socket.addListenner(`http-request-end-${id}`, this.cleanup.bind(this, clientReq, id));
    }

    private handleClientRequest(id: string, clientRes: http.IncomingMessage) {
        const resPayload: ResPayload = {
            headers: clientRes.headers,
            statusCode: clientRes.statusCode
        };
        const resPayloadEncrypted = this.cripto.encryptOb(resPayload);
        this.socket.emit(`http-response-headers-${id}`, resPayloadEncrypted);
        clientRes.on("data", this.socket.emit.bind(this.socket, `http-response-chunk-${id}`));
        clientRes.on("end", this.socket.emit.bind(this.socket, `http-response-end-${id}`));
        clientRes.on("error", this.socket.emit.bind(this.socket, `http-response-error-${id}`));
    }

    private cleanup(req: http.ClientRequest, id: string) {
        req.end();
        this.socket.removeListenners(`http-request-chunk-${id}`);
        this.socket.removeListenners(`http-request-end-${id}`);
    }
}
