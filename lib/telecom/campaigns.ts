import { z } from "zod";
const text = z.string().trim().min(3).max(800);
export const campaignSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,80}$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  status: z.enum(["draft", "verified", "active", "paused", "expired"]),
  title: text,
  operator: text,
  category: z.enum(["internet", "internet_celular", "internet_tv", "internet_camera"]),
  composition: text,
  eligibility: text,
  installation: text,
  fidelity: text,
  firstInvoice: text,
  restrictions: z.array(text).min(1).max(12),
  priceCents: z.number().int().positive().nullable(),
  afterPromotionCents: z.number().int().positive().nullable(),
  promotionalMonths: z.number().int().positive().nullable(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  reviewedAt: z.string().datetime({ offset: true }),
  evidenceId: text,
  reviewedBy: text,
  commercialIdentityConfirmed: z.literal(true),
  verified: z.literal(true),
}).superRefine((campaign, ctx) => {
  if (Date.parse(campaign.endsAt) <= Date.parse(campaign.startsAt))
    ctx.addIssue({ code: "custom", message: "Fim deve ser posterior ao início." });
  if (campaign.promotionalMonths !== null && (campaign.priceCents === null || campaign.afterPromotionCents === null))
    ctx.addIssue({ code: "custom", message: "Desconto temporário exige preço inicial e posterior." });
  if (campaign.afterPromotionCents !== null && campaign.promotionalMonths === null)
    ctx.addIssue({ code: "custom", message: "Preço posterior exige duração do desconto." });
});
export type Campaign = z.infer<typeof campaignSchema>;
export type PublicCampaign = Omit<Campaign, "evidenceId" | "reviewedBy" | "commercialIdentityConfirmed" | "verified" | "status" | "reviewedAt">;

export function currentCampaigns(values: readonly unknown[], now = new Date()): PublicCampaign[] {
  return values.flatMap(value => {
    const parsed = campaignSchema.safeParse(value);
    if (!parsed.success) return [];
    const c = parsed.data;
    const time = now.getTime();
    if (c.status !== "active" || !Number.isFinite(time) || Date.parse(c.startsAt) > time || Date.parse(c.endsAt) <= time ||
      Date.parse(c.reviewedAt) > time || time - Date.parse(c.reviewedAt) > 30 * 86400000) return [];
    // Internal evidence and reviewer identifiers never become browser props.
    const { evidenceId: _evidence, reviewedBy: _reviewer, commercialIdentityConfirmed: _identity, verified: _verified, status: _status, reviewedAt: _reviewed, ...publicCampaign } = c;
    return [publicCampaign];
  });
}
export const formatCampaignMoney = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export const formatCampaignDate = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
