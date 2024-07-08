import * as http from "http";
import { Crypto } from "./crypto";
import { TunnelEmitter } from "./tunnel-emitter";
import { TunnelReceiver } from "./tunnel-receiver";
import { IClientConfigDTO } from "./dtos/client-configs-dto";
import { IReqPayloadDTO } from "./dtos/req-payload-dto";
import { ISocket } from "./ports/socket";

export class Tunnel {
    static listenHttpRequests(cripto: Crypto, socket: ISocket, configs: IClientConfigDTO) {
        new TunnelReceiver(cripto, socket).listen(configs);
    }

    static async createEmitter(
        cripto: Crypto,
        socket: ISocket,
        reqPayload: IReqPayloadDTO,
        res: http.ServerResponse
    ): Promise<TunnelEmitter> {
        return TunnelEmitter.build(cripto, reqPayload, socket, res);
    }
}
