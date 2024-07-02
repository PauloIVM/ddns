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
