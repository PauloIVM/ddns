import * as cryptoLib from "crypto";

export class Crypto {
    private secretKey: string;

    constructor(secretKey: string) {
        if (secretKey && secretKey.length !== 32) {
            throw new Error("SecretKey should have 32 chars.");
        }
        this.secretKey = secretKey || "12345678123456781234567812345678";
    }

    encrypt(data: string) {
        const ivString = cryptoLib.randomBytes(16).toString("hex").slice(0, 16);
        const iv = Buffer.from(ivString);
        const cipher = cryptoLib.createCipheriv("aes-256-cbc", Buffer.from(this.secretKey), iv);
        const encrypted = cipher.update(data, "utf8", "hex") + cipher.final("hex");
        return ivString + encrypted;
    }

    decrypt(text: string) {
        const iv = text.slice(0, 16);
        const data = text.slice(16);
        const decipher = cryptoLib.createDecipheriv("aes-256-cbc", Buffer.from(this.secretKey), Buffer.from(iv));
        const decrypted = decipher.update(data, "hex", "utf8") + decipher.final("utf8");
        return decrypted;
    }
}
