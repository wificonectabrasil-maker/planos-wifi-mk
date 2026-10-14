// Public campaign taxonomy. Add only reviewed marketing identifiers, never free text or customer data.
export const attributionAllowlist: Record<string, readonly string[]> = {
  utm_source: ["google", "bing", "facebook", "instagram"],
  utm_medium: ["cpc", "ppc", "paid_social", "organic", "referral"],
  utm_campaign: [],
  utm_content: [],
  utm_term: [],
};
export function safeAttribution(search: string, campaignId?: string) {
  const params = new URLSearchParams(search);
  const safe: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(attributionAllowlist)) {
    const value = params.get(key);
    if (value && (allowed.includes(value) || (key === "utm_campaign" && campaignId === value))) safe[key] = value;
  }
  return safe;
}
