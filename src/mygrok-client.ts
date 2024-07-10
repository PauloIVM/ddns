import { io } from "socket.io-client";
import { TunnelClient } from "./domain/tunnel-client";
import { Crypto } from "./domain/crypto";
import { ILogger } from "./domain/ports/logger";
import { ISocket } from "./domain/ports/socket";
import { SocketIOClientAdapter } from "./infra/adapters/socket-io-client-adapter";
import { ConsoleLoggerAdapter } from "./infra/adapters/console-logger-adapter";

interface MyGrokClientConfig {
    myGrokServerUrl: string;
    myGrokServerHost: string;
    myGrokClientPort: number;
    myGrokClientHostname: string;
    token?: string;
    secretKey?: string;
    logger?: ILogger;
    encryptAll?: boolean;
}

export class MyGrokClient {
    private myGrokClientPort: number;
    private myGrokServerHost: string;
    private myGrokServerUrl: string;
    private myGrokClientHostname: string;
    private socket: ISocket;
    private logger: MyGrokClientConfig["logger"];
    private crypto: Crypto;
    private token: string;
    private encryptAll: boolean;

    constructor({
        myGrokServerUrl,
        myGrokServerHost,
        token = "default_token",
        myGrokClientPort,
        myGrokClientHostname,
        secretKey,
        logger = new ConsoleLoggerAdapter(),
        encryptAll
    }: MyGrokClientConfig) {
        if (!myGrokClientPort || !myGrokServerUrl || !myGrokServerHost) {
            throw new Error("Port and myGrokServerUrl are required");
        }
        const crypto = new Crypto(secretKey);
        this.encryptAll = !!encryptAll;
        this.myGrokServerUrl = myGrokServerUrl;
        this.myGrokClientPort = myGrokClientPort;
        this.myGrokServerHost = myGrokServerHost;
        this.myGrokClientHostname = myGrokClientHostname || "localhost";
        this.token = token;
        this.socket = new SocketIOClientAdapter(
            io(myGrokServerUrl, { query: { token: crypto.encrypt(token) }})
        );
        this.logger = logger;
        this.crypto = crypto;
    }

    connect() {
        if (!this.socket.connected()) {
            this.socket = new SocketIOClientAdapter(io(this.myGrokServerUrl, {
                query: { token: this.crypto.encrypt(this.token) },
                forceNew: true
            }));
        };
        if (this.socket.getListennersLength() > 1) return;
        this.socket.addListenner("connect", () => {
            this.logger.log(`Connected to mygrok-server ${this.myGrokServerHost}`);
            this.socket.emit("listen-host", this.myGrokServerHost);
        });
        this.socket.addListenner("disconnect", () => {
            this.logger.log(`Disconnected from mygrok-server ${this.myGrokServerHost}`);
        });
        new TunnelClient(this.crypto, this.socket, this.encryptAll).listen({
            hostname: this.myGrokClientHostname,
            port: this.myGrokClientPort
        });
    }

    disconnect() {
        this.socket.disconnect();
    }
}
