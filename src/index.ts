#!/usr/bin/env node

import { Command } from "commander";
import { version } from "../package.json";
import { TunnelServer } from "./tunnel-server";
import { TunnelClient } from "./tunnel-client";
export { TunnelServer };
export { TunnelClient };

const program = new Command();

program
    .name("mygrok")
    .description("CLI to manage your own HTTP strong tunnels.")
    .version(version);

program.command("tunnel-server")
    .description("Start a tunnel-server, that should bem used in a hosted server (the server with a fixed IP or some DNS).")
    .option("-h, --tunnel-server-hosts <string>", "Available hosts that tunnel-clients should connetc to this server.")
    .option("-p, --tunnel-server-port <number>", "Port on which the tunnel-server will run within the hosted server.")
    .option("-t, --token <string>", "Token to be passed here and on the tunnel-clients.")
    .option("-s, --secret-key <string>", "Secret key to encrypt data transmitted in tunnels. Must have exactly 32 characters.")
    .option("-r, --reconnection-timeout <number>", "Reconnection timeout.")
    .action((options) => {
        if (!options.tunnelServerHosts || !options.tunnelServerPort) {
            throw new Error("Required params: --tunnel-server-hosts | --tunnel-server-port");
        }
        new TunnelServer({
            availableHosts: options.tunnelServerHosts.split(","),
            port: Number(options.tunnelServerPort),
            token: options.token,
            secretKey: options.secretKey,
            reconnectionTimeout: Number(options.socketTimeout),
        }).listen(() => console.log(`Tunnel-server running on :${options.tunnelServerPort}`));
    });

program.command("tunnel-client")
    .description("Start a tunnel-client, that should bem used in your local server (the server with a dinamic IP).")
    .option("-u, --tunnel-server-url <string>", "TunnelServer url to connect.")
    .option("-h, --tunnel-server-host <string>", "One of the hosts specified in --tunnel-server-hosts in tunnel-server.")
    .option("-p, --tunnel-client-port <number>", "Port on which tunnel-client will run and expose a local server.")
    .option("-t, --token <string>", "Token to be passed here and on the tunnel-server")
    .option("-s, --secret-key <string>", "Secret key to encrypt data transmitted in tunnels. Must have exactly 32 characters.")
    .option("-l, --local-hostname <string>", "Local hostname, defaults 'localhost'")
    .action((options) => {
        if (!options.tunnelServerUrl || !options.tunnelServerHost || !options.tunnelClientPort) {
            throw new Error("Required params: --tunnel-server-url | --tunnel-server-host | --tunnel-client-port")
        }
        new TunnelClient({
            tunnelServerUrl: options.tunnelServerUrl,
            tunnelServerHost: options.tunnelServerHost,
            localPort: Number(options.tunnelClientPort),
            token: options.token,
            secretKey: options.secretKey,
            localHostname: options.localHostname
        }).connect();
    });

program.parse(process.argv);
