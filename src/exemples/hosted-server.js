import { TunnelServer } from "../tunnel-server.js";

new TunnelServer({
    availableHosts: [
        "server-a.localhost",
        "server-b.localhost",
        "server-b.localhost",
    ],
    token: "my_super_token",
    port: 3000
}).listen(() => console.log("Hosted tunnel-server running on :: 3000..."))
