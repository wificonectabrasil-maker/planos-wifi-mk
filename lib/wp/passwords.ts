import crypto from "crypto";

const SCRYPT_KEYLEN = 64;
const APP_PASSWORD_LENGTH = 24;
const APP_PASSWORD_GROUP = 4;
const APP_PASSWORD_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function normalizeAppPassword(password: string) {
  return password.replace(/\s+/g, "");
}

export function generateAppPassword() {
  const chars: string[] = [];
  for (let i = 0; i < APP_PASSWORD_LENGTH; i += 1) {
    const idx = crypto.randomInt(0, APP_PASSWORD_CHARS.length);
    chars.push(APP_PASSWORD_CHARS[idx]);
  }
  const raw = chars.join("");
  const grouped = raw.match(new RegExp(`.{1,${APP_PASSWORD_GROUP}}`, "g")) ?? [raw];
  return grouped.join(" ");
}

export function hashAppPassword(password: string) {
  const normalized = normalizeAppPassword(password);
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(normalized, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyAppPassword(password: string, storedHash: string) {
  if (!storedHash) return false;
  const [alg, saltB64, hashB64] = storedHash.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const stored = Buffer.from(hashB64, "base64");
  const normalized = normalizeAppPassword(password);
  const derived = crypto.scryptSync(normalized, salt, stored.length);
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(stored, derived);
}