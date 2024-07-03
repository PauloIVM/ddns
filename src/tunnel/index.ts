import * as http from "http";
import { Crypto } from "../crypto";
import { Socket } from "socket.io";
import { Socket as ClientSocket } from "socket.io-client";
import { ResPayload, ReqPayload } from "../types";

export class Tunnel {
    private cripto: Crypto;

    constructor(cripto: Crypto) { this.cripto = cripto; }

    async listenHttpRequest(socket: ClientSocket, resolveHttpRequest: (r: ReqPayload) => Promise<ResPayload>) {
        socket.on("http-request", async (reqPayload: string, callback: (d: string) => void) => {
            try {
                const req = this.cripto.decryptOb<ReqPayload>(reqPayload);
                const res = await resolveHttpRequest(req);
                callback(this.cripto.encryptOb(res));
            } catch (error) {
                callback(this.cripto.encryptOb({ statusCode: 500, headers: {}, body: "" }));
            }
        });
    }

    async emitHttpRequest(socket: Socket, req: http.IncomingMessage): Promise<ResPayload> {
        const body = await this.promisifyHttpReq(req);
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
