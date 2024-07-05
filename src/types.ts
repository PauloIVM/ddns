import * as http from "http";

export type ReqPayload = {
    id: string;
    method: string;
    headers: http.IncomingHttpHeaders;
    url: string;
};

export type ResPayload = {
    statusCode?: number;
    headers: http.IncomingHttpHeaders;
};

export type Logger = {
    error: (msg: string) => void;
    warn: (msg: string) => void;
    log: (msg: string) => void;
};
