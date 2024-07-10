import * as http from "http";

export function createServer(resContent: string): http.Server {
    const server = http.createServer((req, res) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
            res.writeHead(200, { "Content-Type": "text/plain" });
            if (chunks.length) {
                chunks.forEach((c) => { res.write(c); });
                res.end();
            } else {
                res.end(resContent);
            }
        });
    });
    return server;
}

export function createHttpClient() {
    type HttpClientConfig = {
        hostname: string;
        port: number;
        path: string;
        method: string;
        headers: http.IncomingHttpHeaders;
        body?: string;
    };
    type Output = {
        statusCode: number;
        headers: http.IncomingHttpHeaders;
        body: string;
    }
    return {
        request: async (config: HttpClientConfig): Promise<Output> => {
            const { body, ...options } = config;
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
    };
}
