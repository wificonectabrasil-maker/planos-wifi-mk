import type { Metadata } from "next";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { AMAZON_AFFILIATE_DISCLOSURE, SITE_NAME } from "@/lib/site";
import { telecomMetadata } from "@/lib/telecom/metadata";

export const revalidate = 86400;

const description = `Entenda como o ${SITE_NAME} é monetizado por links de afiliado com transparência.`;
export const metadata: Metadata = telecomMetadata(
  "Afiliados e transparência",
  description,
  "/afiliados",
  {
    title: `Afiliados e transparencia | ${SITE_NAME}`,
    description,
    twitterTitle: `Afiliados e transparencia | ${SITE_NAME}`,
  },
);

const LAST_UPDATED_ISO = "2026-02-18";
const LAST_UPDATED_LABEL = "18 de fevereiro de 2026";

export default function AfiliadosPage() {
  return (
    <article className="space-y-6 page-in">
      <BrandBeamCard as="header" className="rounded-3xl p-8">
        <h1 className="text-3xl font-semibold text-(--ink)">Afiliados e Transparência</h1>
        <p className="mt-3 text-sm text-(--muted)">
          Última atualização: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_LABEL}</time>
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
          O {SITE_NAME} participa de programas de afiliados para sustentar a produção de conteúdo.
        </p>
      </BrandBeamCard>

      <BrandBeamCard as="section" className="rounded-3xl p-8 text-sm text-(--muted)">
        <p>{AMAZON_AFFILIATE_DISCLOSURE}</p>
        <p className="mt-3">
          A remuneração por afiliados não altera nossos critérios editoriais e não aumenta o preço pago por você.
        </p>
        <p className="mt-3">
          Nosso compromisso é manter recomendações claras, com foco em segurança, usabilidade e custo-benefício.
        </p>
      </BrandBeamCard>
    </article>
  );
}

