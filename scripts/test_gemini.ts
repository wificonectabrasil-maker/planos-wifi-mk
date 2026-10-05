import * as dotenv from "dotenv";
import { buildGeminiGenerateContentUrl, getGeminiApiKey, getGeminiModel } from "../lib/ai/gemini";

dotenv.config({ path: ".env.local" });

async function checkGemini() {
  const key = getGeminiApiKey();
  console.log("Checando chave API:", key ? `Encontrada (fim: ${key.slice(-4)})` : "NAO ENCONTRADA");

  if (!key) return;

  console.log(`Testando request com ${getGeminiModel()}...`);
  const res = await fetch(buildGeminiGenerateContentUrl(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Responda apenas OK" }] }],
      generationConfig: { temperature: 0 },
    }),
  });

  if (!res.ok) {
    console.error("Erro na API:", res.status, await res.text());
    return;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("API funcionando:", text || "Sem texto na resposta");
}

checkGemini();
