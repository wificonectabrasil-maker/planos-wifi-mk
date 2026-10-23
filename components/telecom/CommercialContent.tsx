import Link from "next/link";
import type { ReactNode } from "react";
import { cache } from "react";
import { getPublicPostsBySilo } from "@/lib/db";
import { PostCard } from "@/components/site/PostCard";
import { wifiEditorialSilos } from "@/lib/telecom/editorial-plan";
import { Breadcrumb } from "./Shared";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { coverageCopy } from "@/lib/telecom/coverage";

export function CommercialIntro({ path, label, title, children, interest, cta }: {
  path: string; label: string; title: string; children: ReactNode; interest: string; cta: string;
}) {
  return <div className="wifi-page-tint"><div className="wifi-container">
    <Breadcrumb items={[{ label, href: path }]} />
    <div className="wifi-page-intro"><p className="wifi-eyebrow">{coverageCopy.eyebrow}</p><h1>{title}</h1>
      <p>{children}</p><div className="wifi-page-actions"><WhatsAppCTA source={path.slice(1) + "-intro"} interest={interest} label={cta} /></div>
      <p className="wifi-small-print">Atendimento humano. Opções e condições confirmadas para seu endereço.</p>
    </div>
  </div></div>;
}
export function ContentSection({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <section id={id} className="wifi-section wifi-container"><div className="wifi-commercial-copy"><h2>{title}</h2>{children}</div></section>;
}
export function CommercialQuestions({ title = "Antes de pedir, tire estas dúvidas", items }: { title?: string; items: readonly (readonly [string, string])[] }) {
  return <section className="wifi-section wifi-container"><div className="wifi-commercial-copy"><h2>{title}</h2>
    <div className="wifi-commercial-questions">{items.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
  </div></section>;
}
export function TransparencyNote() {
  return <p className="wifi-commercial-transparency">A WifiConecta é uma plataforma independente de orientação e intermediação. A operadora ou o provedor contratado presta o serviço, instala e fatura. Mencionar uma marca não significa ser seu site oficial. <Link prefetch={false} href="/politica-de-afiliados">Entenda nossa atuação</Link>.</p>;
}
const publishedArticles = cache(async () => (await Promise.all(["planos-de-internet", "wifi-e-fibra"].map(async silo =>
  (await getPublicPostsBySilo(silo)).map(post => ({ ...post, siloSlug: silo })),
))).flat());
export async function EditorialResources({ slugs }: { slugs: readonly string[] }) {
  const posts = (await publishedArticles()).filter(post => slugs.includes(post.slug));
  if (!posts.length) return null;
  return <section className="wifi-section wifi-container" aria-label="Artigos para orientar sua escolha">
    <div className="wifi-section-heading"><h2>Quer entender um detalhe antes de decidir?</h2></div>
    <div className="system-post-card-grid">{posts.map(post => <PostCard key={post.id} post={post} silo={{ slug: post.siloSlug, name: wifiEditorialSilos.find(silo => silo.slug === post.siloSlug)?.name ?? "Guias" }} />)}</div>
  </section>;
}
