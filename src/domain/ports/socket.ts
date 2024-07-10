export interface ISocket {
    emit(event: string, payload: string | Buffer): boolean;
    emitWithAck(event: string, payload: string | Buffer): Promise<void>;
    addListennerWithAck(event: string, cb: (payload: string | Buffer) => void): void;
    addListenner(event: string, cb: (payload: string | Buffer) => void): void;
    removeListenners(event: string): void;
    getListennersLength(): number;
    getId(): string;
    getToken(): string;
    disconnect(): void;
    connected(): boolean;
}
