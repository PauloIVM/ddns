#!/usr/bin/env node
import { Command } from "commander";
import { version } from "../package.json";
import { MyGrokServer } from "./mygrok-server";
import { MyGrokClient } from "./mygrok-client";
export { MyGrokServer };
export { MyGrokClient };
export { ILogger } from "./domain";

const program = new Command();

program
    .name("mygrok")
    .description("CLI to manage your own HTTP tunnels.")
    .version(version);

program.command("server")
    .description("Start a mygrok-server, that should bem used in a hosted server (the server with a fixed IP or some DNS).")
    .option("-h, --server-hosts <string>", "Available hosts that mygrok-clients should connetc to this server.")
    .option("-p, --server-port <number>", "Port on which the mygrok-server will run within the hosted server.")
    .option("-t, --token <string>", "Token to be passed here and on the mygrok-clients.")
    .option("-s, --secret-key <string>", "Secret key to encrypt data transmitted in tunnels. Must have exactly 32 characters.")
    .option("-r, --reconnection-timeout <number>", "Reconnection timeout.")
    .option("-m, --max-http-buffer-size <number>", "Defaults = 1e6. If tunneling large files in a single strem-chunk, you may want increase this value.")
    .option("-e, --encrypt-all", "By default, only the headers of http requests are encrypted. Use this flag to also encrypt the request and response body data.")
    .action((options) => {
        console.log("encryptAll: ", options.encryptAll);
        new MyGrokServer({
            availableHosts: options.serverHosts?.split(",") || ["localhost"],
            port: Number(options.serverPort || "3000"),
            token: options.token,
            secretKey: options.secretKey,
            reconnectionTimeout: Number(options.reconnectionTimeout),
            maxHttpBufferSize: options.maxHttpBufferSize,
            encryptAll: options.encryptAll
        }).listen(() => console.log(`mygrok-server running on :${options.serverPort}`));
    });

program.command("client")
    .description("Start a mygrok-client, that should bem used in your local server (the server with a dinamic IP).")
    .option("-u, --server-url <string>", "Provides a mygrok-server url to connect.")
    .option("-h, --server-host <string>", "One of the hosts specified in mygrok-server.")
    .option("-p, --client-port <number>", "Port on which mygrok-client will expose a local server.")
    .option("-l, --client-hostname <string>", "Hostname on which mygrok-client will expose a local server.")
    .option("-t, --token <string>", "Token to be passed here and on the mygrok-server")
    .option("-s, --secret-key <string>", "Secret key to encrypt data transmitted in tunnels. Must have exactly 32 characters.")
    .option("-e, --encrypt-all", "By default, only the headers of http requests are encrypted. Use this flag to also encrypt the request and response body data.")
    .action((options) => {
        console.log("encryptAll: ", options.encryptAll);
        new MyGrokClient({
            myGrokServerUrl: options.serverUrl || "http://localhost:3000",
            myGrokServerHost: options.serverHost || "localhost",
            myGrokClientPort: Number(options.clientPort || "4000"),
            myGrokClientHostname: options.clientHostname || "localhost",
            token: options.token,
            secretKey: options.secretKey,
            encryptAll: options.encryptAll
        }).connect();
    });

program.parse(process.argv);
