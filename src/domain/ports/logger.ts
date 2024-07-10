export type ILogger = {
    error: (msg: string) => void;
    warn: (msg: string) => void;
    log: (msg: string) => void;
};
