import * as http from "http";
import { Crypto } from "../crypto";
import { Socket } from "socket.io";
import { Socket as ClientSocket } from "socket.io-client";
import { ResPayload, ReqPayload } from "../types";
import { BaseError } from "../base-error";

interface ClientConfig {
    hostname: string;
    port: number;
}

export class Tunnel {
    private emitterEventsMap: { [event: string]: (...args: any[]) => void } = {};
    private listennerEventsMap: { [event: string]: (...args: any[]) => void } = {};

    constructor(readonly cripto: Crypto) {}

    listenHttpRequest(socket: ClientSocket, { hostname, port }: ClientConfig) {
        socket.on("http-request-init", (reqPayloadEncrypted: string, ack) => {
            console.log("socket-events length: ", Object.keys(socket["_callbacks"]).length);
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
            });
            clientReq.on("error", () => { socket.emit(`http-response-error-${id}`); });
            const cleanup = () => {
                clientReq.end();
                socket.off(`http-request-chunk-${id}`, this.listennerEventsMap[`http-request-chunk-${id}`]);
                socket.off(`http-request-end-${id}`, this.listennerEventsMap[`http-request-end-${id}`]);
                delete this.listennerEventsMap[`http-request-chunk-${id}`];
                delete this.listennerEventsMap[`http-request-end-${id}`];
            };
            this.listennerEventsMap[`http-request-chunk-${id}`] = (chunk) => { clientReq.write(chunk); };
            this.listennerEventsMap[`http-request-end-${id}`] = () => { cleanup(); };
            socket.on(`http-request-chunk-${id}`, this.listennerEventsMap[`http-request-chunk-${id}`]);
            socket.on(`http-request-end-${id}`, this.listennerEventsMap[`http-request-end-${id}`]);
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
            res.end();
            socket.off(`http-response-headers-${id}`, this.emitterEventsMap[`http-response-headers-${id}`]);
            socket.off(`http-response-error-${id}`, this.emitterEventsMap[`http-response-error-${id}`]);
            socket.off(`http-response-chunk-${id}`, this.emitterEventsMap[`http-response-chunk-${id}`]);
            socket.off(`http-response-end-${id}`, this.emitterEventsMap[`http-response-end-${id}`]);
            delete this.emitterEventsMap[`http-response-headers-${id}`];
            delete this.emitterEventsMap[`http-response-error-${id}`];
            delete this.emitterEventsMap[`http-response-chunk-${id}`];
            delete this.emitterEventsMap[`http-response-end-${id}`];
        };
        socket.emitWithAck("http-request-init", reqPayload)
            .then(() => {
                // TODO: Talvez criar um tunnel-error... tentar cair em cada um dos errors...
                req
                    .on("data", (chunk) => {
                        socket.emit(`http-request-chunk-${id}`, chunk);
                    })
                    .on("end", () => {
                        socket.emit(`http-request-end-${id}`); 
                    })
                    .on("error", (err) => {
                        socket.emit(`http-request-end-${id}`); 
                        throw new Error("TODO: criar errors personalizados...");
                    });
            }).catch((e) => {
                throw new Error("TODO: criar errors personalizados...");
            });
        this.emitterEventsMap[`http-response-headers-${id}`] = (resPayloadEncrypted: string) => {
            const resPayload = this.cripto.decryptOb<ResPayload>(resPayloadEncrypted);
            res.writeHead(resPayload.statusCode || 200, resPayload.headers);
        }
        this.emitterEventsMap[`http-response-chunk-${id}`] = (chunk: Buffer) => {
            res.write(chunk);
        }
        this.emitterEventsMap[`http-response-end-${id}`] = () => {
            cleanup();
        }
        this.emitterEventsMap[`http-response-error-${id}`] = () => {
            // TODO: No caso de um error... alterar o status no tunnel-server...
            // res.statusCode = 500;
            // TODO: Receber pelo tunnel a mensagem de error...
            cleanup();
            throw new Error("TODO: criar errors personalizados...");
        }
        socket.on(`http-response-headers-${id}`, this.emitterEventsMap[`http-response-headers-${id}`]);
        socket.on(`http-response-chunk-${id}`, this.emitterEventsMap[`http-response-chunk-${id}`]);
        socket.on(`http-response-end-${id}`, this.emitterEventsMap[`http-response-end-${id}`]);
        socket.on(`http-response-error-${id}`, this.emitterEventsMap[`http-response-error-${id}`]);
        console.log("socket-events length: ", socket.eventNames().length);
    }

    private createId(): string {
        return `${Math.floor(Math.random()*1e8)}${Date.now()}`;
    }
}
