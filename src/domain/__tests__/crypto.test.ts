import { Crypto } from "../crypto";

describe("Crypto", () => {
    test("should encrypt and decrypt", async () => {
        const secret = "fdsaffdaj.ewqer94382t_gshr@fgs$.";
        const msg = "foo";
        const crypto = new Crypto(secret);
        const encrypted = crypto.encrypt(msg);
        expect(encrypted).not.toBe(msg);
        expect(crypto.decrypt(encrypted)).toBe(msg);
    });

    test("should generate different encryptions with each execution", async () => {
        const secret = "fdsaffdaj.ewqer94382t_gshr@fgs$.";
        const msg = "foo";
        const crypto = new Crypto(secret);
        const encrypted = crypto.encrypt(msg);
        expect(crypto.encrypt(msg)).not.toBe(encrypted);
        expect(crypto.decrypt(encrypted)).toBe(msg);
    });

    test("should encrypt and decrypt objects", async () => {
        const secret = "fdsaffdaj.ewqer94382t_gshr@fgs$.";
        const ob = { foo: "bar" };
        const crypto = new Crypto(secret);
        const encrypted = crypto.encryptOb(ob);
        expect(encrypted).not.toEqual(ob);
        expect(crypto.decryptOb(encrypted)).toEqual(ob);
    });

    test("should not accept invalid secret", async () => {
        const secret = "bad_secret";
        expect(() => new Crypto(secret)).toThrow(
            new Error("SecretKey should have 32 chars.")
        );
    });
});
