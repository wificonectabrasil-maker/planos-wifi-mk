import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function listModels() {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    console.log("Listando modelos com chave final:", key?.slice(-4));

    if (!key) return;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

    if (res.ok) {
        const data = await res.json();
        console.log("Modelos Disponíveis:");
        data.models?.forEach((m: any) => {
            console.log(`- ${m.name} (${m.supportedGenerationMethods?.join(", ")})`);
        });
    } else {
        console.error("Erro:", res.status, await res.text());
    }
}

listModels();
