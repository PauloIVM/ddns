import * as http from "http";
import { Crypto } from "./crypto";
import { ISocket } from "./ports/socket";
import { IClientConfigDTO } from "./dtos/client-configs-dto";
import { IReqPayloadDTO } from "./dtos/req-payload-dto";
import { IResPayloadDTO } from "./dtos/res-payload-dto";

export class TunnelClient {
    constructor(readonly crypto: Crypto, readonly socket: ISocket, readonly encryptAll?: boolean) {}

    listen({ hostname, port }: IClientConfigDTO) {
        this.socket.addListennerWithAck("http-request-init", this.handleRequestInit.bind(
            this,
            hostname,
            port
        ));
    }

    private handleRequestInit(hostname: string, port: number, reqPayloadEncrypted: string) {
        const { url, method, id, headers } = this.crypto.decryptOb<IReqPayloadDTO>(reqPayloadEncrypted);
        const options = { hostname, port, path: url, method, headers };
        const clientReq = http.request(options, this.handleClientRequest.bind(this, id));
        clientReq.on("error", this.socket.emit.bind(this.socket, `http-response-error-${id}`));
        this.socket.addListenner(`http-request-chunk-${id}`, (c) => {
            const chunk = this.encryptAll ? this.crypto.decrypt(c as string) : c;
            clientReq.write(chunk);
        });
        this.socket.addListenner(`http-request-end-${id}`, this.cleanup.bind(this, clientReq, id));
    }

    private handleClientRequest(id: string, clientRes: http.IncomingMessage) {
        const resPayload: IResPayloadDTO = {
            headers: clientRes.headers,
            statusCode: clientRes.statusCode
        };
        const resPayloadEncrypted = this.crypto.encryptOb(resPayload);
        this.socket.emit(`http-response-headers-${id}`, resPayloadEncrypted);
        clientRes.on("data", (c: Buffer) => {
            const chunk = this.encryptAll ? this.crypto.encrypt(c.toString()) : c;
            this.socket.emit(`http-response-chunk-${id}`, chunk);
        });
        clientRes.on("end", this.socket.emit.bind(this.socket, `http-response-end-${id}`));
        clientRes.on("error", this.socket.emit.bind(this.socket, `http-response-error-${id}`));
    }

    private cleanup(req: http.ClientRequest, id: string) {
        req.end();
        this.socket.removeListenners(`http-request-chunk-${id}`);
        this.socket.removeListenners(`http-request-end-${id}`);
    }
}
