import * as http from "http";
import { Crypto } from "../crypto";
import { Socket } from "socket.io";
import { Socket as ClientSocket } from "socket.io-client";
import { ResPayload, ReqPayload } from "../types";

interface ClientConfig {
    hostname: string;
    port: number;
}

export class Tunnel {
    private cripto: Crypto;

    constructor(cripto: Crypto) { this.cripto = cripto; }

    async listenHttpRequest(socket: ClientSocket, { hostname, port }: ClientConfig) {
        socket.on("http-request-init", async (reqPayloadEncrypted: string, ack) => {
            const { url, method, id, headers } = this.cripto.decryptOb<ReqPayload>(reqPayloadEncrypted);
            const clientReq = http.request({ hostname, port, path: url, method, headers }, (clientRes) => {
                const resPayload: ResPayload = {
                    headers: clientRes.headers,
                    statusCode: clientRes.statusCode
                };
                const resPayloadEncrypted = this.cripto.encryptOb(resPayload);
                socket.emit(`http-response-headers-${id}`, resPayloadEncrypted);
                clientRes.on("data", (chunk) => { socket.emit(`http-response-chunk-${id}`, chunk); });
                clientRes.on("end", () => { socket.emit(`http-response-end-${id}`); });
                clientRes.on("error", (err) => { socket.emit(`http-response-error-${id}`); });
            })
            socket.on(`http-request-chunk-${id}`, (chunk) => { clientReq.write(chunk); });
            socket.on(`http-request-end-${id}`, () => {
                clientReq.end();
                socket.off(`http-request-end-${id}`, () => {});
                socket.off(`http-request-chunk-${id}`, () => {});
            });
            ack();
        });
    }

    emitHttpRequest(socket: Socket, req: http.IncomingMessage, res: http.ServerResponse) {
        const id = this.createId();
        const reqPayload = this.cripto.encryptOb<ReqPayload>({
            id,
            method: req.method,
            headers: req.headers,
            url: req.url
        });
        const cleanup = () => {
            socket.off(`http-response-headers-${id}`, () => {});
            socket.off(`http-response-error-${id}`, () => {});
            socket.off(`http-response-chunk-${id}`, () => {});
            socket.off(`http-response-end-${id}`, () => {});
        };
        // TODO: Dar um console.log nos listenners do socket pra conferir se estão sendo limpos
        //       corretamente.
        // TODO: Adicionar possibilidade de criptografar os chunks?? Talvez nessa modalidade aí
        //       sim agrupar todos os chunks antes de enviar.
        socket.emitWithAck("http-request-init", reqPayload)
            .then(() => {
                req
                    .on("data", (chunk) => {
                        socket.emit(`http-request-chunk-${id}`, chunk);
                    })
                    .on("end", () => {
                        socket.emit(`http-request-end-${id}`); 
                    })
                    .on("error", (err) => {
                        socket.emit(`http-request-end-${id}`); 
                        // TODO: tratar errors...
                    });
            }).catch((e) => {
                // TODO: tratar errors...
            });
        socket.on(`http-response-headers-${id}`, (resPayloadEncrypted: string) => {
            const resPayload = this.cripto.decryptOb<ResPayload>(resPayloadEncrypted);
            res.writeHead(resPayload.statusCode || 200, resPayload.headers);
        });
        socket.on(`http-response-chunk-${id}`, (chunk: Buffer) => {
            res.write(chunk);
        });
        socket.on(`http-response-end-${id}`, () => {
            res.end();
            cleanup();
        });
        socket.on(`http-response-error-${id}`, () => {
            // TODO: tratar errors...
            res.statusCode = 500;
            res.end();
            cleanup();
        });
    }

    private createId(): string {
        return `${Math.floor(Math.random()*1e8)}${Date.now()}`;
    }
}
