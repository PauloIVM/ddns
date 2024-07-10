import * as http from "http";
import { Duplex, Writable } from "stream";
import { Crypto } from "./crypto";
import { ISocket } from "./ports/socket";
import { IReqPayloadDTO } from "./dtos/req-payload-dto";
import { IResPayloadDTO } from "./dtos/res-payload-dto";

export class TunnelServer extends Duplex {
    private constructor(
        readonly crypto: Crypto,
        readonly reqPayload: IReqPayloadDTO,
        readonly socket: ISocket,
    ) {
        super();
    }

    static async build(crypto: Crypto, reqPayload: IReqPayloadDTO, socket: ISocket): Promise<TunnelServer> {
        const tunnelEmitter = new TunnelServer(crypto, reqPayload, socket);
        tunnelEmitter.setupResponseListenners();
        await socket.emitWithAck("http-request-init", crypto.encryptOb<IReqPayloadDTO>(reqPayload));
        return tunnelEmitter;
    }

    static buildDestination(res: http.ServerResponse) {
        return new Writable({
            write(chunk: IResPayloadDTO | Buffer, encoding, callback) {
                const resPayload = chunk as IResPayloadDTO;
                if (typeof resPayload === "object" && resPayload.headers) {
                    res.writeHead(resPayload.statusCode || 200, resPayload.headers)
                } else {
                    res.write(chunk);
                }
                callback();
            },
            final(callback) {
                res.end();
                callback();
            },
            destroy(error, callback) {
                res.end();
                callback(error);
            },
        });
    }

    _read(size: number): void {}

    _write(chunk: Buffer, encoding: string, cb: () => void) {
        this.socket.emit(`http-request-chunk-${this.reqPayload.id}`, chunk);
        cb();
    }

    _final(cb: () => void) {
        this.socket.emit(`http-request-end-${this.reqPayload.id}`, ""); 
        cb();
    }

    _destroy(e: any, cb: (e?: any) => void) {
        if (!e) { cb(); return; }
        this.cleanup();
        cb(e);
    }

    private setupResponseListenners() {
        const onResponseError = () => { this.push(null); this.cleanup(); };
        const onResponseChunk = (c: Buffer) => { this.push(c); };
        const onResponseEnd = () => { this.push(null); this.cleanup(); };
        const onResponseHeaders = (resPayloadEncrypted: string) => {
            const resPayload = this.crypto.decryptOb<IResPayloadDTO>(resPayloadEncrypted);
            this.push(resPayload);
        };
        this.socket.addListenner(`http-response-headers-${this.reqPayload.id}`, onResponseHeaders);
        this.socket.addListenner(`http-response-chunk-${this.reqPayload.id}`, onResponseChunk);
        this.socket.addListenner(`http-response-end-${this.reqPayload.id}`, onResponseEnd);
        this.socket.addListenner(`http-response-error-${this.reqPayload.id}`, onResponseError);
    }

    private cleanup() {
        this.socket.removeListenners(`http-response-headers-${this.reqPayload.id}`);
        this.socket.removeListenners(`http-response-error-${this.reqPayload.id}`);
        this.socket.removeListenners(`http-response-chunk-${this.reqPayload.id}`);
        this.socket.removeListenners(`http-response-end-${this.reqPayload.id}`);
    }
}
