import { Socket } from "socket.io-client";
import { ISocket } from "./socket";

export class SocketIOClientAdapter implements ISocket {
    private listennersMap: { [event: string]: (...args: any[]) => void } = {};

    constructor(readonly _socket: Socket) {}

    emit(event: string, payload: string | Buffer): boolean {
        this._socket.emit(event, payload);
        return true;
    }

    async emitWithAck(event: string, payload: string | Buffer): Promise<void> {
        try {
            const response = await this._socket.emitWithAck(event, payload);
            if (!response?.ok) throw new Error("Failed to emit with ack.");
        } catch (error) {
            throw new Error("Failed to emit with ack.");
        }
    }

    addListennerWithAck(event: string, cb: (p: string | Buffer) => void): void {
        this.listennersMap[event] = cb;
        this._socket.on("http-request-init", (payload: string | Buffer, ack) => {
            try {
                cb(payload);
                ack({ ok: true });
            } catch (error) {
                ack();
            }
        });
    }

    addListenner(event: string, cb: (payload: string | Buffer) => void): void {
        this.listennersMap[event] = cb;
        this._socket.on(event, cb);
    }

    removeListenners(event: string): void {
        Object.keys(this.listennersMap).forEach((e) => {
            if (e !== event) return;
            this._socket.off(event, this.listennersMap[event]);
            delete this.listennersMap[event];
        });
    }

    getListennersLength(): number {
        return Object.keys(this._socket["_callbacks"]).length;
    }
}
