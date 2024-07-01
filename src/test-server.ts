import * as http from "http";

const PORT = 4000;

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    const data = [];
    req.on("data", chunk => {
        data.push(chunk);
        console.log("Received chunk:", chunk.toString());
    });
    req.on("end", () => {
        console.log("Request complete.");
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(`req.url: ${req.url} \ndata: ${Buffer.concat(data).toString()}`);
    });
    req.on("error", (err) => {
        console.error("Error receiving data:", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
    });
});
server.listen(PORT, () => {
    console.log(`Client server 1 running on :: ${PORT}`);
});
