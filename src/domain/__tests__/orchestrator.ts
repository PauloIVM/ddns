import { ISocket } from "../ports";

export function createSocket(): ISocket {
    let listenners = {};
    return {
        emit(event: string, payload: string | Buffer): boolean {
            if (listenners[event]) listenners[event](payload);
            return true;
        },
        async emitWithAck(event: string, payload: string | Buffer): Promise<void> {
            if (listenners[event]) listenners[event](payload);
        },
        addListennerWithAck(event: string, cb: (payload: string | Buffer) => void): void {
            listenners[event] = cb;
        },
        addListenner(event: string, cb: (payload: string | Buffer) => void): void {
            listenners[event] = cb;
        },
        removeListenners(event: string): void {
            Object.keys(listenners).forEach((e) => {
                if (e === event) { delete listenners[e]; }
            })
        },
        getListennersLength(): number {
            return Object.keys(listenners).length;
        },
        getId(): string { return ""; },
        getToken(): string { return ""; },
        disconnect(): void {},
        connected(): boolean { return true; },
    }
}
