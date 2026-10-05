import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { getAdminEmail, getAdminPassword, isAdminAuthDisabled } from "@/lib/admin/settings";

export async function getExpectedSessionValue() {
  const email = getAdminEmail();
  const password = getAdminPassword();
  
  const encoder = new TextEncoder();
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Configure ADMIN_SESSION_SECRET para proteger as sessões.");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const data = encoder.encode(`${email}:${password}`);
  const hashBuffer = await crypto.subtle.sign("HMAC", key, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function isAdminSession() {
  if (isAdminAuthDisabled()) return true;
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieVal) return false;
  
  const expectedHash = await getExpectedSessionValue();
  return cookieVal === expectedHash;
}

export async function requireAdminSession() {
  if (isAdminAuthDisabled()) return;
  if (!(await isAdminSession())) {
    throw new Error("Unauthorized");
  }
}
