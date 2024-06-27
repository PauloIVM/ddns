import io from "socket.io-client";
import http from "http";

export class TunnelClient {
    constructor({
        tunnelServerUrl,
        tunnelServerHost,
        token,
        localPort,
        localHostname,
        logger
    } = {}) {
        if (!localPort || !tunnelServerUrl || !tunnelServerHost) throw new Error("Port and TunnelServerUrl are required");
        this.token = token;
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

    handleHttpRequestFromTunnelServer(requestOptions, body, callback) {
        const options = {
            hostname: this.hostname,
            port: this.localPort,
            path: requestOptions.url,
            method: requestOptions.method,
            headers: requestOptions.headers
        };
        const req = http.request(options, (res) => {
            let responseBody = [];
            res.on("data", (chunk) => { responseBody.push(chunk); }).on("end", () => {
                responseBody = Buffer.concat(responseBody).toString();
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
