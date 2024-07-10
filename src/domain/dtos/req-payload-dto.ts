import * as http from "http";

export type IReqPayloadDTO = {
    id: string;
    method: string;
    headers: http.IncomingHttpHeaders;
    url: string;
};
