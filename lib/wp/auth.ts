import { getAdminDatabase } from "@/lib/database";
import { normalizeAppPassword, verifyAppPassword } from "@/lib/wp/passwords";

export type WpAuthUser = {
  username: string;
  displayName: string | null;
};

export type WpAuthResult =
  | { ok: true; user: WpAuthUser }
  | { ok: false; status: number; code: string; message: string };

function parseBasicAuth(header: string | null) {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !token) return null;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const idx = decoded.indexOf(":");
    if (idx <= 0) return null;
    const username = decoded.slice(0, idx);
    const password = decoded.slice(idx + 1);
    if (!username || !password) return null;
    return { username, password };
  } catch {
    return null;
  }
}

function unauthorized(message = "Unauthorized"):
  { ok: false; status: number; code: string; message: string } {
  return {
    ok: false,
    status: 401,
    code: "rest_not_logged_in",
    message,
  };
}

export async function authenticateWpRequest(req: Request): Promise<WpAuthResult> {
  const basic = parseBasicAuth(req.headers.get("authorization"));
  if (!basic) return unauthorized("Authorization required");

  const { username, password } = basic;

  const envUser = process.env.WP_FAKE_USER?.trim();
  const envPass = process.env.WP_FAKE_PASSWORD?.trim();
  if (envUser && envPass) {
    const normalizedEnv = normalizeAppPassword(envPass);
    const normalizedPass = normalizeAppPassword(password);
    if (username === envUser && normalizedPass === normalizedEnv) {
      return { ok: true, user: { username, displayName: envUser } };
    }
  }

  const database = getAdminDatabase();
  const { data, error } = await database
    .from("wp_app_passwords")
    .select("username, display_name, password_hash, is_active")
    .eq("username", username)
    .eq("is_active", true);

  if (error) {
    return {
      ok: false,
      status: 500,
      code: "rest_auth_error",
      message: error.message || "Auth lookup failed",
    };
  }

  const rows = Array.isArray(data) ? data : [];
  for (const row of rows) {
    const hash = String((row as any).password_hash ?? "");
    if (!hash) continue;
    if (verifyAppPassword(password, hash)) {
      return {
        ok: true,
        user: {
          username: String((row as any).username ?? username),
          displayName: (row as any).display_name ?? null,
        },
      };
    }
  }

  return unauthorized("Invalid credentials");
}
