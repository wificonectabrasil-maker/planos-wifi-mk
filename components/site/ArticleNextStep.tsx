import Link from "next/link";
import { brandConfig } from "@/brand.config";

type NextStepConfig = {
  articleNextStep?: {
    title: string;
    description: string;
    href: string;
    label: string;
  };
};

export function ArticleNextStep() {
  const nextStep = (brandConfig as NextStepConfig).articleNextStep;
  if (!nextStep) return null;
  return (
    <aside className="system-article-next-step" aria-label="Próximo passo">
      <h2>{nextStep.title}</h2>
      <p>{nextStep.description}</p>
      <Link href={nextStep.href} target={nextStep.href.startsWith("https://wa.me/") ? "_blank" : undefined} rel={nextStep.href.startsWith("https://wa.me/") ? "noopener noreferrer" : undefined}>{nextStep.label}</Link>
    </aside>
  );
}
