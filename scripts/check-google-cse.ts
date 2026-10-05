import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: false });
loadEnv({ path: resolve(process.cwd(), ".env"), override: false });

type CheckResult = {
  ok: boolean;
  status: number;
  classification:
    | "ok"
    | "missing_env"
    | "invalid_key"
    | "api_disabled_or_no_access"
    | "billing_required"
    | "request_blocked_by_restriction"
    | "invalid_cx"
    | "quota_exceeded"
    | "unknown";
  message: string;
  nextStep: string;
};

function getEnv(name: string): string {
  const value = process.env[name]?.trim().replace(/^"|"$/g, "");
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function mask(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function classifyError(status: number, payload: unknown): CheckResult {
  const error =
    typeof payload === "object" && payload !== null && "error" in payload
      ? (payload as { error?: { message?: string; errors?: Array<{ reason?: string }> } }).error
      : undefined;
  const message = error?.message ?? "Google Custom Search request failed.";
  const reason = error?.errors?.[0]?.reason?.toLowerCase() ?? "";
  const normalized = message.toLowerCase();

  if (status === 400 && (normalized.includes("api key not valid") || reason === "badrequest")) {
    return {
      ok: false,
      status,
      classification: "invalid_key",
      message,
      nextStep: "Confirme se a chave pertence ao projeto correto e se foi copiada sem espacos extras.",
    };
  }

  if (normalized.includes("invalid value") && normalized.includes("cx")) {
    return {
      ok: false,
      status,
      classification: "invalid_cx",
      message,
      nextStep: "Revise o Search Engine ID (cx) no Programmable Search Engine.",
    };
  }

  if (
    normalized.includes("does not have the access to custom search json api") ||
    normalized.includes("api has not been used in project") ||
    normalized.includes("is disabled")
  ) {
    return {
      ok: false,
      status,
      classification: "api_disabled_or_no_access",
      message,
      nextStep: "No Google Cloud, abra o mesmo projeto da chave e confirme que a Custom Search JSON API esta habilitada.",
    };
  }

  if (normalized.includes("billing") && normalized.includes("enabled")) {
    return {
      ok: false,
      status,
      classification: "billing_required",
      message,
      nextStep: "Verifique se esse projeto exige faturamento ativo para a API usada.",
    };
  }

  if (
    normalized.includes("referer") ||
    normalized.includes("ip address") ||
    normalized.includes("requests from this referrer are blocked") ||
    normalized.includes("api keys with referer restrictions cannot be used")
  ) {
    return {
      ok: false,
      status,
      classification: "request_blocked_by_restriction",
      message,
      nextStep:
        "Remova restricao por HTTP referrer para uso server-side, ou troque por API restriction apenas para Custom Search JSON API.",
    };
  }

  if (status === 429 || normalized.includes("quota")) {
    return {
      ok: false,
      status,
      classification: "quota_exceeded",
      message,
      nextStep: "Revise a cota da API no projeto Google Cloud.",
    };
  }

  return {
    ok: false,
    status,
    classification: "unknown",
    message,
    nextStep: "Revise a resposta completa abaixo e valide API key, cx e configuracao do projeto no Google Cloud.",
  };
}

async function main() {
  const apiKey = getEnv("GOOGLE_CSE_API_KEY");
  const cx = getEnv("GOOGLE_CSE_CX");
  const query = process.argv.slice(2).join(" ").trim() || "seo tecnico";

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "1");
  url.searchParams.set("hl", "pt-BR");
  url.searchParams.set("gl", "BR");

  console.log(`[check-google-cse] key=${mask(apiKey)} cx=${cx} query="${query}"`);

  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();

  let payload: unknown = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (response.ok) {
    const items =
      typeof payload === "object" && payload !== null && "items" in payload
        ? ((payload as { items?: unknown[] }).items ?? [])
        : [];
    const result: CheckResult = {
      ok: true,
      status: response.status,
      classification: "ok",
      message: `Consulta concluida com ${items.length} resultado(s).`,
      nextStep: "A chave e o cx estao funcionando para o SERP server-side.",
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const result = classifyError(response.status, payload);
  console.log(JSON.stringify(result, null, 2));
  console.log("[check-google-cse] raw_response");
  console.log(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
  process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown error";
  const result: CheckResult = message.startsWith("Missing env:")
    ? {
        ok: false,
        status: 0,
        classification: "missing_env",
        message,
        nextStep: "Preencha GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX no .env.local.",
      }
    : {
        ok: false,
        status: 0,
        classification: "unknown",
        message,
        nextStep: "Revise o erro acima.",
      };

  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
});
