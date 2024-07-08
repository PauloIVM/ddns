import * as http from "http";
import { Writable } from "stream";
import { Crypto } from "./crypto";
import { ISocket } from "./ports/socket";
import { IReqPayloadDTO } from "./dtos/req-payload-dto";
import { IResPayloadDTO } from "./dtos/res-payload-dto";

export class TunnelEmitter extends Writable {
    private constructor(
        readonly cripto: Crypto,
        readonly reqPayload: IReqPayloadDTO,
        readonly socket: ISocket,
        readonly res: http.ServerResponse
    ) {
        super();
    }

    static async build(
        cripto: Crypto,
        reqPayload: IReqPayloadDTO,
        socket: ISocket,
        res: http.ServerResponse
    ): Promise<TunnelEmitter> {
        const tunnelEmitter = new TunnelEmitter(cripto, reqPayload, socket, res);
        tunnelEmitter.setupResponseListenners();
        await socket.emitWithAck("http-request-init", cripto.encryptOb<IReqPayloadDTO>(reqPayload));
        return tunnelEmitter;
    }

    _write(chunk: Buffer) {
        this.socket.emit(`http-request-chunk-${this.reqPayload.id}`, chunk);
    }

    _final() {
        this.socket.emit(`http-request-end-${this.reqPayload.id}`, ""); 
    }

    _destroy(e, callback) {
        if (e) { this.cleanup(); return; }
        callback();
    }

    private setupResponseListenners() {
        const onResponseHeaders = (resPayloadEncrypted: string) => {
            const resPayload = this.cripto.decryptOb<IResPayloadDTO>(resPayloadEncrypted);
            this.res.writeHead(resPayload.statusCode || 200, resPayload.headers);
        };
        const onResponseError = () => {
            this.res.statusCode = 500;
            this.cleanup();
        };
        const onResponseChunk = (c: Buffer) => this.res.write(c);
        const onResponseEnd = () => this.cleanup();
        this.socket.addListenner(`http-response-headers-${this.reqPayload.id}`, onResponseHeaders);
        this.socket.addListenner(`http-response-chunk-${this.reqPayload.id}`, onResponseChunk);
        this.socket.addListenner(`http-response-end-${this.reqPayload.id}`, onResponseEnd);
        this.socket.addListenner(`http-response-error-${this.reqPayload.id}`, onResponseError);
    }

    private cleanup() {
        this.res.end();
        this.socket.removeListenners(`http-response-headers-${this.reqPayload.id}`);
        this.socket.removeListenners(`http-response-error-${this.reqPayload.id}`);
        this.socket.removeListenners(`http-response-chunk-${this.reqPayload.id}`);
        this.socket.removeListenners(`http-response-end-${this.reqPayload.id}`);
    }
}
