import * as http from "http";
import { ResPayload } from "../types";

interface HttpClientConfig {
    hostname: string;
    port: number;
    path: string;
    method: string;
    headers: http.IncomingHttpHeaders;
    body: string;
}

export class HttpClient {
    static async request({
        hostname,
        port,
        path,
        method,
        headers,
        body,
    }: HttpClientConfig): Promise<ResPayload> {
        const options = { hostname, port, path, method, headers };
        return new Promise((resolve, rejects) => {
            const req = http.request(options, (res) => {
                const resBodyChunks: Buffer[] = [];
                res.on("data", (chunk) => { resBodyChunks.push(chunk); }).on("end", () => {
                    const responseBody = Buffer.concat(resBodyChunks).toString();
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: responseBody
                    });
                });
            });
            req.on("error", (e) => {
                rejects(e);
            });
            if (body) req.write(body);
            req.end();
        });
    }
}
