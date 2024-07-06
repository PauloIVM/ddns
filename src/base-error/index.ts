export class BaseError extends Error {
    constructor(name: string, message: string) {
        super(message);
        this.name = name || this.constructor.name;
    }
}
