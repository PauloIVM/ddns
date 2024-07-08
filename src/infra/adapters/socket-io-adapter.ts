import { Socket } from "socket.io";
import { ISocket } from "../../domain/ports/socket";

export class SocketIOAdapter implements ISocket {
    private listennersMap: { [event: string]: (...args: any[]) => void } = {};

    constructor(readonly _socket: Socket) {}

    getId(): string {
        return this._socket.id;
    }

    getToken(): string {
        return this._socket.handshake.query.token as string;
    }

    emit(event: string, payload: string | Buffer): boolean {
        return this._socket.emit(event, payload);
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
        this._socket.on(event, (payload: string | Buffer, ack) => {
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
        return this._socket.eventNames().length;
    }

    disconnect(): void {
        this._socket.disconnect();
    }
}
