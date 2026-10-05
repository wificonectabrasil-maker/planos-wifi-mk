import { getAdminDatabase } from "@/lib/database";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

type GoogleSettingsRow = {
  id: string;
  api_key: string | null;
  cx: string | null;
  updated_at?: string | null;
};

export type GoogleCseSettings = {
  apiKey: string | null;
  cx: string | null;
  updatedAt?: string | null;
};

export type GoogleCseCredentials = {
  apiKey: string;
  cx: string;
  source: "env" | "db";
};

function maskKey(value: string) {
  if (value.length <= 6) return "****";
  return `****${value.slice(-4)}`;
}

function isMissingTableError(error: any) {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  return /relation .*google_cse_settings.* does not exist/i.test(message);
}

export async function getGoogleCseSettingsFromDb(): Promise<GoogleCseSettings | null> {
  try {
    const database = getAdminDatabase();
    const { data, error } = await database
      .from("google_cse_settings")
      .select("id, api_key, cx, updated_at")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return null;
      throw error;
    }

    if (!data) return null;
    const row = data as GoogleSettingsRow;
    return {
      apiKey: row.api_key ?? null,
      cx: row.cx ?? null,
      updatedAt: row.updated_at ?? null,
    };
  } catch (error) {
    if (isMissingTableError(error)) return null;
    return null;
  }
}

export async function saveGoogleCseSettings(args: { apiKey?: string | null; cx?: string | null }) {
  const database = getAdminDatabase();
  const existing = await getGoogleCseSettingsFromDb();

  const apiKey = typeof args.apiKey === "string" ? args.apiKey.trim() : args.apiKey ?? existing?.apiKey ?? null;
  const cx = typeof args.cx === "string" ? args.cx.trim() : args.cx ?? existing?.cx ?? null;

  const payload = {
    id: SETTINGS_ID,
    api_key: apiKey && apiKey.length ? apiKey : null,
    cx: cx && cx.length ? cx : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await database.from("google_cse_settings").upsert(payload, { onConflict: "id" });
  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("Tabela google_cse_settings ausente. Rode a migration turso/migrations.");
    }
    throw error;
  }

  return {
    apiKeyMasked: payload.api_key ? maskKey(payload.api_key) : null,
    cx: payload.cx ?? null,
  };
}

export async function getGoogleCseCredentials(): Promise<GoogleCseCredentials | null> {
  const envKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const envCx = process.env.GOOGLE_CSE_CX?.trim();
  if (envKey && envCx) {
    return { apiKey: envKey, cx: envCx, source: "env" };
  }

  const db = await getGoogleCseSettingsFromDb();
  if (db?.apiKey && db?.cx) {
    return { apiKey: db.apiKey, cx: db.cx, source: "db" };
  }

  return null;
}

export async function getGoogleCseSettingsSummary() {
  const envKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const envCx = process.env.GOOGLE_CSE_CX?.trim();
  const db = await getGoogleCseSettingsFromDb();

  return {
    source: envKey && envCx ? ("env" as const) : db?.apiKey && db?.cx ? ("db" as const) : ("none" as const),
    envPresent: Boolean(envKey && envCx),
    stored: {
      apiKeyMasked: db?.apiKey ? maskKey(db.apiKey) : null,
      cx: db?.cx ?? null,
      updatedAt: db?.updatedAt ?? null,
    },
  };
}
