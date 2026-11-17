import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored?: string) {
  const [, salt, hex] = (
    stored || "scrypt$00000000000000000000000000000000$" + "0".repeat(128)
  ).split("$");
  const key = await derive(password, salt);
  const expected = Buffer.from(hex, "hex");
  return (
    expected.length === key.length && timingSafeEqual(key, expected) && !!stored
  );
}
export const sessionToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
