import * as http from "http";
import * as crypto from "crypto";
import { Socket, io } from "socket.io-client";
import { ReqPayload, ResPayload, SocketCallback } from "../types";

interface TunnelClientConfig {
    tunnelServerUrl: string;
    tunnelServerHost: string;
    token: string;
    secretKey?: string;
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
    private secretKey: string;
    private logger: TunnelClientConfig["logger"];

    constructor({
        tunnelServerUrl,
        tunnelServerHost,
        token,
        localPort,
        localHostname,
        secretKey,
        logger
    }: TunnelClientConfig) {
        if (!localPort || !tunnelServerUrl || !tunnelServerHost) throw new Error("Port and TunnelServerUrl are required");
        if (secretKey && secretKey.length !== 32) {
            throw new Error("SecretKey should have 32 chars.");
        }
        this.localPort = localPort;
        this.tunnelServerHost = tunnelServerHost;
        this.hostname = localHostname || "localhost";
        this.secretKey = secretKey || "12345678123456781234567812345678";
        this.socket = io(tunnelServerUrl, token && { query: {
            token: this.encrypt(token)
        }});
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

    private encrypt(data: string) {
        const ivString = crypto.randomBytes(16).toString("hex").slice(0, 16);
        const iv = Buffer.from(ivString);
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(this.secretKey), iv);
        const encrypted = cipher.update(data, "utf8", "hex") + cipher.final("hex");
        return ivString + encrypted;
    }

    private decrypt(text: string) {
        const iv = text.slice(0, 16);
        const data = text.slice(16);
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(this.secretKey), Buffer.from(iv));
        const decrypted = decipher.update(data, "hex", "utf8") + decipher.final("utf8");
        return decrypted;
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
