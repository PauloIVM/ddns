import { TunnelClient } from "../tunnel-client.js";
import express from "express";
import http from "http";

const LOCAL_PORT = 4001;

new TunnelClient({
    tunnelServerHost: "server-b.localhost",
    tunnelServerUrl: "http://localhost:3000",
    localPort: LOCAL_PORT,
    token: "my_super_token"
}).connect();

const PORT = LOCAL_PORT;
const app = express();
app.use("/", (req, res) => res.json({ message: `hello ${req.query["name"]}` }));
const server = http.createServer(app);
server.listen(PORT, () => {
    console.log(`Client server 2 running on :: ${PORT}`);
});
