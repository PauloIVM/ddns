import * as http from "http";

export type IResPayloadDTO = {
    statusCode?: number;
    headers: http.IncomingHttpHeaders;
};
