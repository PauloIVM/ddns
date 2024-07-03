import { HttpClient } from "../http-client";
import { Crypto } from "../crypto";
import { Socket, io } from "socket.io-client";
import { ReqPayload } from "../types";

interface MyGrokClientConfig {
    myGrokServerUrl: string;
    myGrokServerHost: string;
    myGrokClientPort: number;
    myGrokClientHostname: string;
    token?: string;
    secretKey?: string;
    logger?: {
        error: (msg: string) => void;
        warn: (msg: string) => void;
        log: (msg: string) => void;
    };
}

export class MyGrokClient {
    private myGrokClientPort: number;
    private myGrokServerHost: string;
    private hostname: string;
    private socket: Socket;
    private cripto: Crypto;
    private logger: MyGrokClientConfig["logger"];

    constructor({
        myGrokServerUrl,
        myGrokServerHost,
        token = "default_token",
        myGrokClientPort,
        myGrokClientHostname,
        secretKey,
        logger
    }: MyGrokClientConfig) {
        if (!myGrokClientPort || !myGrokServerUrl || !myGrokServerHost) {
            throw new Error("Port and myGrokServerUrl are required");
        }
        this.myGrokClientPort = myGrokClientPort;
        this.myGrokServerHost = myGrokServerHost;
        this.hostname = myGrokClientHostname || "localhost";
        this.cripto = new Crypto(secretKey);
        this.socket = io(myGrokServerUrl, { query: { token: this.cripto.encrypt(token) }});
        this.logger = logger || { error: console.error, warn: console.warn, log: console.log };
    }

    connect() {
        this.socket.on("connect", () => {
            this.logger.log(`Connected to mygrok-server ${this.myGrokServerHost}`);
            this.socket.emit("listen-host", this.myGrokServerHost);
        });
        this.socket.on("disconnect", () => {
            this.logger.log(`Disconnected from mygrok-server ${this.myGrokServerHost}`);
        });
        this.socket.on("http-request", this.handleHttpRequestFromServer.bind(this));
    }

    private async handleHttpRequestFromServer(reqPayload: string, callback: (d: string) => void) {
        try {
            const req = this.cripto.decryptOb<ReqPayload>(reqPayload);
            const res = await HttpClient.request({
                hostname: this.hostname,
                port: this.myGrokClientPort,
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
