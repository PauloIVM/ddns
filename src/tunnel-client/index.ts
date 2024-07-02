import { HttpClient } from "../http-client";
import { Crypto } from "../crypto";
import { Socket, io } from "socket.io-client";
import { ReqPayload } from "../types";

interface TunnelClientConfig {
    tunnelServerUrl: string;
    tunnelServerHost: string;
    token?: string;
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
    private cripto: Crypto;
    private logger: TunnelClientConfig["logger"];

    constructor({
        tunnelServerUrl,
        tunnelServerHost,
        token = "default_token",
        localPort,
        localHostname,
        secretKey,
        logger
    }: TunnelClientConfig) {
        if (!localPort || !tunnelServerUrl || !tunnelServerHost) {
            throw new Error("Port and TunnelServerUrl are required");
        }
        this.localPort = localPort;
        this.tunnelServerHost = tunnelServerHost;
        this.hostname = localHostname || "localhost";
        this.cripto = new Crypto(secretKey);
        this.socket = io(tunnelServerUrl, { query: { token: this.cripto.encrypt(token) }});
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

    private async handleHttpRequestFromTunnelServer(reqPayload: string, callback: (d: string) => void) {
        try {
            const req = this.cripto.decryptOb<ReqPayload>(reqPayload);
            const res = await HttpClient.request({
                hostname: this.hostname,
                port: this.localPort,
                path: req.url,
                method: req.method,
                headers: req.headers,
                body: req.body
            });
            callback(this.cripto.encryptOb(res));
        } catch (error) {
            this.logger.error(error);
            callback(this.cripto.encryptOb({ statusCode: 500, headers: {}, body: "" }));
        }
    }
}
