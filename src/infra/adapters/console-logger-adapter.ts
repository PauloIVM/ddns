import { ILogger } from "../../domain/ports";

export class ConsoleLoggerAdapter implements ILogger {
    error(msg: string): void {
        console.error(msg);
    }

    warn(msg: string): void {
        console.warn(msg);
    }

    log(msg: string): void {
        console.log(msg);
    }
}
