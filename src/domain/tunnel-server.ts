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
        readonly encryptAll: boolean,
    ) {
        super();
    }

    static async build(
        crypto: Crypto,
        reqPayload: IReqPayloadDTO,
        socket: ISocket,
        encryptAll?: boolean
    ): Promise<TunnelServer> {
        const tunnelEmitter = new TunnelServer(crypto, reqPayload, socket, !!encryptAll);
        tunnelEmitter.setupResponseListenners();
        await socket.emitWithAck("http-request-init", crypto.encryptOb<IReqPayloadDTO>(reqPayload));
        return tunnelEmitter;
    }

    static buildDestination(res: http.ServerResponse) {
        return new Writable({
            write: (() => {
                let isFirstChunk = true;
                return (chunk: Buffer, encoding, callback) => {
                    if (isFirstChunk) {
                        const resPayload: IResPayloadDTO = JSON.parse(chunk.toString());
                        res.writeHead(resPayload.statusCode || 200, resPayload.headers);
                        isFirstChunk = false;
                    } else {
                        res.write(chunk);
                    }
                    callback();
                }
            })(),
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

    _write(c: Buffer, encoding: string, cb: () => void) {
        const chunk = this.encryptAll ? this.crypto.encrypt(c.toString()) : c;
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
        const onResponseEnd = () => { this.push(null); this.cleanup(); };
        const onResponseChunk = (c) => {
            const chunk = this.encryptAll ? this.crypto.decrypt(c) : c;
            this.push(chunk);
        };
        const onResponseHeaders = (resPayloadEncrypted: string) => {
            const resPayload = this.crypto.decryptOb<IResPayloadDTO>(resPayloadEncrypted);
            this.push(JSON.stringify(resPayload));
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
