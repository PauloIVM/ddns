import { Crypto } from "../crypto";
import { Socket, io } from "socket.io-client";
import { Logger } from "../types";
import { Tunnel } from "../tunnel";

interface MyGrokClientConfig {
    myGrokServerUrl: string;
    myGrokServerHost: string;
    myGrokClientPort: number;
    myGrokClientHostname: string;
    token?: string;
    secretKey?: string;
    logger?: Logger;
}

export class MyGrokClient {
    private myGrokClientPort: number;
    private myGrokServerHost: string;
    private myGrokClientHostname: string;
    private socket: Socket;
    private logger: MyGrokClientConfig["logger"];
    private tunnel: Tunnel;

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
        const cripto = new Crypto(secretKey);
        this.myGrokClientPort = myGrokClientPort;
        this.myGrokServerHost = myGrokServerHost;
        this.myGrokClientHostname = myGrokClientHostname || "localhost";
        this.socket = io(myGrokServerUrl, { query: { token: cripto.encrypt(token) }});
        this.logger = logger || { error: console.error, warn: console.warn, log: console.log };
        this.tunnel = new Tunnel(cripto);
    }

    connect() {
        this.socket.on("connect", () => {
            this.logger.log(`Connected to mygrok-server ${this.myGrokServerHost}`);
            this.socket.emit("listen-host", this.myGrokServerHost);
        });
        this.socket.on("disconnect", () => {
            this.logger.log(`Disconnected from mygrok-server ${this.myGrokServerHost}`);
        });
        this.tunnel.listenHttpRequests(this.socket, {
            hostname: this.myGrokClientHostname,
            port: this.myGrokClientPort
        });
    }
}
