const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MODEL_PREFIXES = ["gemini-", "gemma-"];

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

export function getGeminiModel() {
  const configured = (process.env.GEMINI_MODEL || "").trim();
  const normalized = configured.replace(/^models\//, "");

  if (MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return normalized;
  }

  return DEFAULT_GEMINI_MODEL;
}

export function buildGeminiGenerateContentUrl(apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent?key=${apiKey}`;
}
