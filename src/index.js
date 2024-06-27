#!/usr/bin/env node

import { Command } from "commander";
import json from "../package.json" assert { type: 'json' };
import { TunnelServer } from "./tunnel-server.js";
import { TunnelClient } from "./tunnel-client.js";

const program = new Command();

program
    .name("sst-grok")
    .description("CLI to manage your own HTTP strong tunnels.")
    .version(json.version);

program.command("tunnel-server")
    .description("Start a tunnel-server, that should bem used in a hosted server (the server with a fixed IP or some DNS).")
    .option("-h, --tunnel-server-hosts <hosts>", "Available hosts that tunnel-clients should connetc to this server.")
    .option("-p, --tunnel-server-port <port>", "Port on which the tunnel-server will run within the hosted server.")
    .option("-t, --token <token>", "Token to be passed here and on the tunnel-clients.")
    .option("-s, --socket-timeout <number>", "Socket connections timeout.")
    .option("-o, --http-timeout <number>", "Http requests timeout.")
    .action((options) => {
        if (!options.tunnelServerHosts || !options.tunnelServerPort) {
            throw new Error("Required params: --tunnel-server-hosts | --tunnel-server-port");
        }
        new TunnelServer({
            availableHosts: options.tunnelServerHosts.split(","),
            port: options.tunnelServerPort,
            token: options.token,
            socketTimeout: options.socketTimeout,
            httpTimeout: options.httpTimeout,
        }).listen(() => console.log("Hosted tunnel-server running on :: 3000..."));
    });

program.command("tunnel-client")
    .description("Start a tunnel-client, that should bem used in your local server (the server with a dinamic IP).")
    .option("-u, --tunnel-server-url <url>", "TunnelServer url to connect.")
    .option("-h, --tunnel-server-host <host>", "One of the hosts specified in --tunnel-server-hosts in tunnel-server.")
    .option("-p, --tunnel-client-port <port>", "Port on which tunnel-client will run and expose a local server.")
    .option("-t, --token <token>", "Token to be passed here and on the tunnel-server")
    .action((options) => {
        if (!options.tunnelServerUrl || !options.tunnelServerHost || !options.tunnelClientPort) {
            throw new Error("Required params: --tunnel-server-url | --tunnel-server-host | --tunnel-client-port")
        }
        new TunnelClient({
            tunnelServerUrl: options.tunnelServerUrl,
            tunnelServerHost: options.tunnelServerHost,
            localPort: options.tunnelClientPort,
            token: options.token,
        }).connect();
    });

program.parse(process.argv);
