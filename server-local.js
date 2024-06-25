const WebSocket = require("ws");
const os = require("os");
const http = require("http");
const { setInterval } = require("timers");

const server = http.createServer(async (req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("Ok.. its working..");
});
server.listen(3006, () => {
    console.log("Server listening on port 3006");
});

let currentIP = getLocalIP();
const ws = new WebSocket("ws://localhost:3005");

function checkIPChange() {
    const newIP = getLocalIP();
    if (newIP !== currentIP) {
        console.log("IP changed:", newIP);
        currentIP = newIP;
        // ws.send(currentIP);
        ws.send("localhost:3006");
    }
}

ws.on("open", () => {
    console.log("Connected to cloud server");
    console.log(currentIP);
    // ws.send(currentIP);
    ws.send("localhost:3006");
    setInterval(checkIPChange, 4000);
});

ws.on("error", (error) => {
    console.error("WebSocket error:", error);
});

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let interfaceName in interfaces) {
        for (let iface of interfaces[interfaceName]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
}
