import * as http from "http";
import { Socket, io } from "socket.io-client";
import { ReqPayload, ResPayload, SocketCallback } from "../types";

interface TunnelClientConfig {
    tunnelServerUrl: string;
    tunnelServerHost: string;
    token: string;
    localPort: number;
    localHostname: string;
    logger?: {
        error: (msg: string) => void;
        warn: (msg: string) => void;
        log: (msg: string) => void;
    };
}

export class TunnelClient {
    private localPort: number;
    private tunnelServerHost: string;
    private hostname: string;
    private socket: Socket;
    private logger: TunnelClientConfig["logger"];

    constructor({
        tunnelServerUrl,
        tunnelServerHost,
        token,
        localPort,
        localHostname,
        logger
    }: TunnelClientConfig) {
        if (!localPort || !tunnelServerUrl || !tunnelServerHost) throw new Error("Port and TunnelServerUrl are required");
        this.localPort = localPort;
        this.tunnelServerHost = tunnelServerHost;
        this.hostname = localHostname || "localhost";
        this.socket = io(tunnelServerUrl, token && { query: { token } });
        this.logger = logger || { error: console.error, warn: console.warn, log: console.log };
    }

    connect() {
        this.socket.on("connect", () => {
            this.logger.log(`Connected to tunnel-server ${this.tunnelServerHost}`);
            this.socket.emit("listen-host", this.tunnelServerHost);
        });
        this.socket.on("disconnect", () => {
            this.logger.log(`Disconnected from tunnel-server ${this.tunnelServerHost}`);
        });
        this.socket.on("http-request", this.handleHttpRequestFromTunnelServer.bind(this));
    }

    private async handleHttpRequestFromTunnelServer(reqPayload: ReqPayload, callback: SocketCallback) {
        const options = {
            hostname: this.hostname,
            port: this.localPort,
            path: reqPayload.url,
            method: reqPayload.method,
            headers: reqPayload.headers,
            body: reqPayload.body,
        };
        try {
            const res = await HttpClient.request(
                options.hostname,
                options.port,
                options.path,
                options.method,
                options.headers,
                options.body
            );
            callback(res);
        } catch (error) {
            this.logger.error(error);
            callback({ statusCode: 500, headers: {}, body: "" });
        }
    }
}

class HttpClient {
    static async request(
        hostname: string,
        localPort: number,
        path: string,
        method: string,
        headers: http.IncomingHttpHeaders,
        body: string
    ): Promise<ResPayload> {
        const options = {
            hostname: hostname,
            port: localPort,
            path,
            method: method,
            headers: headers
        };
        return new Promise((resolve, rejects) => {
            const req = http.request(options, (res) => {
                const resBodyChunks: Buffer[] = [];
                res.on("data", (chunk) => { resBodyChunks.push(chunk); }).on("end", () => {
                    const responseBody = Buffer.concat(resBodyChunks).toString();
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: responseBody
                    });
                });
            });
            req.on("error", (e) => {
                rejects(e);
            });
            if (body) req.write(body);
            req.end();
        });
    }
}
