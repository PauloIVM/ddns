import { TunnelServer, Crypto } from "../";
import { createSocket } from "./orchestrator";

describe("TunnelServer", () => {
    test("should receive response", async (done) => {
        const crypto = new Crypto("fdsaffdaj.ewqer94382t_gshr@fgs$.");
        const socket = createSocket();
        const payload = { id: "fake_id", method: "POST", headers: {}, url: "/" };
        socket.addListennerWithAck("http-request-init", () => {
            socket.emit(`http-response-headers-${payload.id}`, crypto.encryptOb({ foo: "bar" }));
            socket.emit(`http-response-chunk-${payload.id}`, "chunk_1");
            socket.emit(`http-response-chunk-${payload.id}`, "chunk_2");
            socket.emit(`http-response-chunk-${payload.id}`, "chunk_3");
            socket.emit(`http-response-chunk-${payload.id}`, "chunk_4");
            socket.emit(`http-response-end-${payload.id}`, "");
        });
        const tunnel = await TunnelServer.build(crypto, payload, socket);
        const chunks: Buffer[] = [];
        tunnel.on("data", (c) => chunks.push(c));
        tunnel.on("end", () => {
            expect(chunks).toEqual([
                Buffer.from(JSON.stringify({ foo: "bar" })),
                Buffer.from("chunk_1"),
                Buffer.from("chunk_2"),
                Buffer.from("chunk_3"),
                Buffer.from("chunk_4"),
            ]); 
            done();
        });
        tunnel.end();
    });

    test("should send request", async (done) => {
        const crypto = new Crypto("fdsaffdaj.ewqer94382t_gshr@fgs$.");
        const socket = createSocket();
        const payload = { id: "fake_id", method: "POST", headers: {}, url: "/" };
        const chunks: (Buffer | string)[] = [];
        socket.addListennerWithAck("http-request-init", (p) => {
            expect(crypto.decryptOb(p as string)).toEqual(payload);
            socket.addListenner(`http-request-chunk-${payload.id}`, (c) => chunks.push(c));
            socket.addListenner(`http-request-end-${payload.id}`, () => {
                expect(chunks).toEqual([
                    Buffer.from("chunk_1"),
                    Buffer.from("chunk_2"),
                    Buffer.from("chunk_3"),
                    Buffer.from("chunk_4"),
                ]); 
                done();
            });
        });
        const tunnel = await TunnelServer.build(crypto, payload, socket);
        tunnel.write("chunk_1");
        tunnel.write("chunk_2");
        tunnel.write("chunk_3");
        tunnel.write("chunk_4");
        tunnel.end();
    });

    test("should send request full encrypted", async (done) => {
        const crypto = new Crypto("fdsaffdaj.ewqer94382t_gshr@fgs$.");
        const socket = createSocket();
        const payload = { id: "fake_id", method: "POST", headers: {}, url: "/" };
        const chunks: (Buffer | string)[] = [];
        socket.addListennerWithAck("http-request-init", (p) => {
            expect(crypto.decryptOb(p as string)).toEqual(payload);
            socket.addListenner(`http-request-chunk-${payload.id}`, (c) => chunks.push(c));
            socket.addListenner(`http-request-end-${payload.id}`, () => {
                expect(crypto.decrypt(chunks[0] as string)).toBe("chunk_1");
                expect(crypto.decrypt(chunks[1] as string)).toBe("chunk_2");
                expect(crypto.decrypt(chunks[2] as string)).toBe("chunk_3");
                expect(crypto.decrypt(chunks[3] as string)).toBe("chunk_4");
                done();
            });
        });
        const tunnel = await TunnelServer.build(crypto, payload, socket, true);
        tunnel.write("chunk_1");
        tunnel.write("chunk_2");
        tunnel.write("chunk_3");
        tunnel.write("chunk_4");
        tunnel.end();
    });
});
