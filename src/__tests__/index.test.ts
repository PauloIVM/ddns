import * as http from "http";
import { MyGrokClient } from "../mygrok-client";
import { MyGrokServer } from "../mygrok-server";
import {
    createHttpClient,
    createServer
} from "./orchestrator";

describe("Tunnel", () => {
    let server: http.Server;
    let mygrokServer: MyGrokServer;
    let mygrokClient: MyGrokClient;

    beforeAll((done) => {
        server = createServer("hello-world");
        mygrokServer = new MyGrokServer({
            availableHosts: ["localhost"],
            port: 3000,
        });
        mygrokClient = new MyGrokClient({
            myGrokServerUrl: "http://localhost:3000",
            myGrokServerHost: "localhost",
            myGrokClientPort: 4000,
            myGrokClientHostname: "localhost",
        });
        mygrokServer.listen(() => {
            server.listen(4000, () => {
                mygrokClient.connect();
                done();
            });
        });
    });

    test("should work", async () => {
        const options = {
            hostname: "localhost",
            port: 3000,
            path: "/",
            method: "POST",
            headers: {}
        };
        const res = await createHttpClient().request(options);
        expect(res.body).toBe("hello-world");
    });

    test("should work with reconection", async () => {
        mygrokClient.disconnect();
        const options = {
            hostname: "localhost",
            port: 3000,
            path: "/",
            method: "POST",
            headers: {}
        };
        setTimeout(() => mygrokClient.connect(), 1000);
        const res = await createHttpClient().request(options);
        expect(res.body).toBe("hello-world");
    });

    test("should tunnel stream in chunks", (done) => {
        const options = {
            hostname: "localhost",
            port: 3000,
            path: "/",
            method: "POST",
            headers: {}
        };
        const chunks: string[] = [];
        const req = http.request(options, (res) => {
            res.on("data", (chunk: Buffer) => {
                chunks.push(chunk.toString());
            });
            res.on("end", () => {
                expect(chunks[0]).toBe("foo");
                expect(chunks[1]).toBe("bar");
                done();
            });
        });
        req.write("foo");
        req.write("bar");
        req.end();
    });

    afterAll((done) => {
        server.close(() => {
            mygrokServer.close(() => {
                mygrokClient.disconnect();
                done();
            });
        });
    });
});