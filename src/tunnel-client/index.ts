import { Socket, io } from "socket.io-client";
import * as http from "http";

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
        this.socket.on("httpRequest", this.handleHttpRequestFromTunnelServer.bind(this));
    }

    private handleHttpRequestFromTunnelServer(requestOptions, body, callback) {
        const options = {
            hostname: this.hostname,
            port: this.localPort,
            path: requestOptions.url,
            method: requestOptions.method,
            headers: requestOptions.headers
        };
        const req = http.request(options, (res) => {
            const responseBodyChunks: Buffer[] = [];
            res.on("data", (chunk) => { responseBodyChunks.push(chunk); }).on("end", () => {
                const responseBody = Buffer.concat(responseBodyChunks).toString();
                const responseOptions = { statusCode: res.statusCode, headers: res.headers };
                callback(responseOptions, responseBody);
            });
        });
        req.on("error", (e) => {
            console.error(`Problema com a requisição: ${e.message}`);
        });
        if (body) req.write(body);
        req.end();
    }
}
