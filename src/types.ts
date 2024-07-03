import * as http from "http";

export type ReqPayload = {
    method: string;
    headers: http.IncomingHttpHeaders;
    url: string;
    body: string;
};

export type ResPayload = {
    statusCode?: number;
    headers: http.IncomingHttpHeaders;
    body: string;
};

export type Logger = {
    error: (msg: string) => void;
    warn: (msg: string) => void;
    log: (msg: string) => void;
};
