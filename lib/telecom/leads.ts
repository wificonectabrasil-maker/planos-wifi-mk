import { z } from "zod";
import { categories, categoryLabels } from "./catalog";
export const leadSchema = z.object({
  cep: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{8}$/, "Digite um CEP com 8 números.")),
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
    .pipe(z.string().regex(/^[1-9]\d{9,10}$/, "Informe seu telefone com DDD.")),
  address: z.string().trim().max(240).default(""),
  service: z.enum(categories),
  interest: z.string().trim().max(160).default(""),
  sourcePath: z
    .string()
    .max(300)
    .regex(/^\/(?!\/)/)
    .default("/"),
  consent: z.literal(true, {
    errorMap: () => ({
      message: "Autorize o contato para enviar sua solicitação.",
    }),
  }),
  website: z.string().max(0).default(""),
});
export type LeadInput = z.infer<typeof leadSchema>;
export function whatsappMessage(
  lead: Pick<LeadInput, "cep" | "interest" | "service">,
  protocol: string,
) {
  return `Olá! Quero consultar planos pela WifiConecta.\nCEP: ${lead.cep.slice(0, 5)}-${lead.cep.slice(5)}\nServiço: ${categoryLabels[lead.service]}\nInteresse: ${lead.interest || "Quero ajuda para escolher"}\nProtocolo: ${protocol}`;
}
