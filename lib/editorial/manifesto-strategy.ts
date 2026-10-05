import { brandConfig } from "@/brand.config";
import type { EditorialArticlePlan } from "./content-plan";
export type EditorialManifestoStrategy = {
  obviousAngleToAvoid: string;
  painToExpose: string;
  localSeoReframe: string;
  eeatRole: string;
  priorityAction: string;
  manifestoChecks: string[];
  bottomFunnelActions: string[];
  strategicReframeBrief: string;
};
export function buildEditorialManifestoStrategy(args: {
  articlePlan?: EditorialArticlePlan | null;
  slug?: string | null;
  title?: string | null;
  keyword?: string | null;
  text?: string | null;
}): EditorialManifestoStrategy {
  const intent =
    args.articlePlan?.uniqueIntent ||
    args.keyword ||
    args.title ||
    "a dúvida do leitor";
  return {
    obviousAngleToAvoid:
      "Evitar explicações genéricas que não respondam à intenção de busca.",
    painToExpose: "Explicar o problema com evidências e sem exageros.",
    localSeoReframe: "Conectar o tema ao contexto e à intenção do leitor.",
    eeatRole: brandConfig.sourcePolicy,
    priorityAction: "Responder de forma útil e verificável a: " + intent,
    manifestoChecks: brandConfig.manifesto,
    bottomFunnelActions: ["Indicar um próximo passo coerente com o tema."],
    strategicReframeBrief: [
      brandConfig.sourcePolicy,
      ...brandConfig.manifesto,
      "Intenção: " + intent,
    ].join("\n"),
  };
}
