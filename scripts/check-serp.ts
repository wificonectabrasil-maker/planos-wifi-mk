import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: false });
loadEnv({ path: resolve(process.cwd(), ".env"), override: false });

type CheckResult = {
  ok: boolean;
  provider: "serper" | "google_cse" | "none";
  status: number;
  message: string;
  nextStep: string;
};

function stripQuotes(value: string | undefined) {
  return value?.trim().replace(/^"|"$/g, "") ?? "";
}

function mask(value: string) {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function checkSerper(apiKey: string, query: string): Promise<CheckResult> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q: query,
      gl: "br",
      hl: "pt-br",
      num: 1,
    }),
  });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (response.ok && typeof payload.error !== "string") {
    return {
      ok: true,
      provider: "serper",
      status: response.status,
      message: `Serper respondeu com ${(payload.organic as unknown[] | undefined)?.length ?? 0} resultado(s).`,
      nextStep: "A chave da Serper esta valida para o backend de SERP.",
    };
  }

  return {
    ok: false,
    provider: "serper",
    status: response.status || 400,
    message: typeof payload.error === "string" ? payload.error : "Falha ao consultar a Serper.",
    nextStep: "Revise a chave no painel da Serper e confirme que a conta esta ativa.",
  };
}

async function checkGoogleCse(apiKey: string, cx: string, query: string): Promise<CheckResult> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "1");
  url.searchParams.set("hl", "pt-BR");
  url.searchParams.set("gl", "BR");

  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (response.ok) {
    return {
      ok: true,
      provider: "google_cse",
      status: response.status,
      message: `Google CSE respondeu com ${((payload.items as unknown[]) ?? []).length} resultado(s).`,
      nextStep: "A chave do Google CSE esta valida para o backend de SERP.",
    };
  }

  const error =
    typeof payload.error === "object" && payload.error !== null
      ? (payload.error as Record<string, unknown>)
      : {};

  return {
    ok: false,
    provider: "google_cse",
    status: response.status || 400,
    message: typeof error.message === "string" ? error.message : "Falha ao consultar o Google CSE.",
    nextStep: "Revise API key, cx e acesso do projeto a Custom Search JSON API.",
  };
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim() || "seo tecnico";
  const serperApiKey = stripQuotes(process.env.SERPER_API_KEY) || stripQuotes(process.env.SERPAPI_KEY);
  const googleApiKey = stripQuotes(process.env.GOOGLE_CSE_API_KEY);
  const googleCx = stripQuotes(process.env.GOOGLE_CSE_CX);

  if (serperApiKey) {
    console.log(`[check-serp] provider=serper key=${mask(serperApiKey)} query="${query}"`);
    const result = await checkSerper(serperApiKey, query);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
    return;
  }

  if (googleApiKey && googleCx) {
    console.log(`[check-serp] provider=google_cse key=${mask(googleApiKey)} cx=${googleCx} query="${query}"`);
    const result = await checkGoogleCse(googleApiKey, googleCx, query);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: false,
        provider: "none",
        status: 0,
        message: "Nenhuma credencial de SERP encontrada.",
        nextStep: "Configure SERPER_API_KEY, SERPAPI_KEY ou GOOGLE_CSE_API_KEY com GOOGLE_CSE_CX.",
      } satisfies CheckResult,
      null,
      2
    )
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        provider: "none",
        status: 0,
        message: error instanceof Error ? error.message : "unknown error",
        nextStep: "Revise a configuracao do provedor de busca.",
      } satisfies CheckResult,
      null,
      2
    )
  );
  process.exit(1);
});
