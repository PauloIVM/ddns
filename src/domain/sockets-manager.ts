import { ISocket, ILogger } from "./ports";

export class SocketsManager {
    private socketsMapper: { [id: string]: ISocket};
    private logger: ILogger;
    private reconnectionTimeout: number;

    constructor(logger: ILogger, reconnectionTimeout: number) {
        this.logger = logger;
        this.reconnectionTimeout = reconnectionTimeout;
        this.socketsMapper = {};
    }

    async get(id: string) {
        if (!this.socketsMapper[id]) await this.retry(id);
        return this.socketsMapper[id];
    }

    add(id: string, socket: ISocket) {
        if (this.socketsMapper[id]) return false;
        this.socketsMapper[id] = socket;
        return true;
    }

    remove(socket: ISocket) {
        let idRemoved: string;
        Object.keys(this.socketsMapper).forEach((id) => {
            if (this.socketsMapper[id]?.getId() !== socket.getId()) return;
            this.socketsMapper[id] = null;
            idRemoved = id;
        });
        return idRemoved;
    }

    private async retry(id: string, initiatedAt = new Date()) {
        this.logger.warn(`Lost socket connection to ${id}, waiting for reconnection..`);
        if (this.reconnectionTimeout < Date.now() - initiatedAt.getTime()) return;
        if (this.socketsMapper[id]) return;
        await this.sleep(1000);
        await this.retry(id, initiatedAt); 
    }
    
    private async sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
