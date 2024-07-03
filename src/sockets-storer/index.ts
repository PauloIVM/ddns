import { Socket } from "socket.io";
import { Logger } from "../types";

export class SocketStorer {
    private socketsMapper: { [id: string]: Socket};
    private logger: Logger;
    private reconnectionTimeout: number;

    constructor(logger: Logger, reconnectionTimeout: number) {
        this.logger = logger;
        this.reconnectionTimeout = reconnectionTimeout;
        this.socketsMapper = {};
    }

    async get(id: string) {
        if (!this.socketsMapper[id]) await this.retry(id);
        return this.socketsMapper[id];
    }

    add(id: string, socket: Socket) {
        if (this.socketsMapper[id]) return false;
        this.socketsMapper[id] = socket;
        return true;
    }

    remove(socket: Socket) {
        let idRemoved: string;
        Object.keys(this.socketsMapper).forEach((id) => {
            if (this.socketsMapper[id]?.id !== socket.id) return;
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
