import { buildGeminiGenerateContentUrl, getGeminiApiKey } from "@/lib/ai/gemini";

type AIAuditPayload = {
    siloName: string;
    links: Array<{
        occurrenceId: string;
        sourceTitle: string;
        targetTitle: string;
        anchorText: string;
        contextSnippet: string;
        sourceFocusKeywords?: string[];
        targetFocusKeywords?: string[];
    }>;
};

type AIAuditResult = {
    linkSuggestions: Array<{
        occurrenceId: string;
        suggested_anchor?: string[] | string;
        suggestion_note?: string;
        intent_match?: number;
        coherence_note?: string;
        remove_link_if?: string;
    }>;
};

const STRICT_PROMPT = `
You are an SEO assistant. Do not judge quality. Only suggest anchor improvements and coherence notes.

Rules:
- Use ONLY the provided data.
- Do not invent information.
- Respond with valid JSON only (no markdown, no extra text).
- If you are not sure, return suggested_anchor as an empty array.

Input (JSON):
{{PAYLOAD}}

Required JSON output:
{
  "linkSuggestions": [
    {
      "occurrenceId": "string",
      "suggested_anchor": ["option 1", "option 2"],
      "suggestion_note": "string",
      "intent_match": 0,
      "coherence_note": "string",
      "remove_link_if": "string"
    }
  ]
}
`;

export async function auditSiloWithAI(payload: AIAuditPayload): Promise<AIAuditResult | null> {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
        console.error("[AI DEBUG] GEMINI_API_KEY not found.");
        return null;
    }

    console.log(`[AI DEBUG] Starting AI assist for silo: ${payload.siloName} (${payload.links.length} links). Key: ...${apiKey.slice(-4)}`);

    const systemPrompt = STRICT_PROMPT.replace("{{PAYLOAD}}", JSON.stringify(payload));

    try {
        const response = await fetch(
            buildGeminiGenerateContentUrl(apiKey),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2
                    }
                })
            }
        );

        if (!response.ok) {
            console.error("[AI DEBUG] Gemini HTTP error:", response.status, await response.text());
            return null;
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) return null;

        return JSON.parse(textResponse) as AIAuditResult;
    } catch (error) {
        console.error("AI Service Exception:", error);
        return null;
    }
}
