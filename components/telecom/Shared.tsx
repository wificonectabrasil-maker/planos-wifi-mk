import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ListChecks,
  MapPin,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveSiteUrl } from "@/lib/site/url";
export function Breadcrumb({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  const all = [{ label: "Início", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Caminho da página" className="wifi-breadcrumb">
        {all.map((item, index) => (
          <span key={item.href}>
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {index === all.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </span>
        ))}
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            item: `${resolveSiteUrl()}${item.href}`,
          })),
        }}
      />
    </>
  );
}
export function ContractProcess() {
  const steps = [
    {
      icon: MessagesSquare,
      title: "Chame no WhatsApp",
      text: "Uma pessoa da equipe ouve o que você precisa e confere as opções pro seu endereço em São Paulo.",
    },
    {
      icon: ListChecks,
      title: "Escolha com tudo explicado",
      text: "Confira o pacote, os benefícios, a mensalidade, a instalação e quando começa a cobrança.",
    },
    {
      icon: MessagesSquare,
      title: "A gente encaminha o pedido",
      text: "Com a sua confirmação, a equipe solicita o serviço e orienta os próximos passos da instalação com a operadora.",
    },
  ];
  return (
    <section className="wifi-section wifi-process" id="como-funciona">
      <div className="wifi-container">
        <div className="wifi-section-heading">
          <div>
            <p className="wifi-eyebrow">Tudo começa pelo WhatsApp</p>
            <h2>Da escolha ao pedido, com uma pessoa ao seu lado.</h2>
            <p>Conte o que precisa. A gente ajuda a entender as opções e cuida do encaminhamento do pedido.</p>
          </div>
        </div>
        <div className="wifi-process-grid">
          {steps.map((step, index) => (
            <div key={step.title}>
              <span className="wifi-step-number">0{index + 1}</span>
              <step.icon size={26} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export function FinalCTA() {
  return (
    <section className="wifi-final-cta">
      <div className="wifi-container">
        <div>
          <p className="wifi-eyebrow">Seu dia já tem coisa demais</p>
          <h2>Deixa o pedido de internet com a gente.</h2>
          <p>
            Chame no WhatsApp e conte o que precisa. Uma pessoa da equipe
            explica os pacotes, tira suas dúvidas e ajuda a encaminhar o
            serviço que você escolher.
          </p>
          <WhatsAppCTA
            source="final-cta"
            className="wifi-final-whatsapp"
            label="Encontrar meu pacote no WhatsApp"
            fallbackLabel="Encontrar meu pacote"
          />
        </div>
        <div className="wifi-final-context">
          <MapPin size={28} aria-hidden="true" />
          <h3>Atendimento em São Paulo</h3>
          <p>Por enquanto, atendemos São Paulo. As promoções são temporárias e os valores variam por bairro. Consulte as condições atuais pelo WhatsApp.</p>
        </div>
      </div>
    </section>
  );
}
export function TrustStrip() {
  return (
    <div className="wifi-trust-strip wifi-container">
      <span>
        <ShieldCheck size={20} />
        Condições explicadas na conversa
      </span>
      <span>
        <ListChecks size={20} />
        Atendimento com uma pessoa
      </span>
      <span>
        <BadgeCheck size={20} />
        São Paulo, por enquanto
      </span>
    </div>
  );
}
export function RegionNotice() {
  return (
    <div className="wifi-region-notice">
      <MapPin size={22} aria-hidden="true" />
      <p><strong>Atendimento em São Paulo, por enquanto.</strong> As promoções mudam e as condições variam por bairro. Pacotes, valores e benefícios são apresentados no WhatsApp.</p>
    </div>
  );
}
export function GuideCards() {
  const guides = [
    {
      title: "Como encontrar seu próximo pacote?",
      text: "Conte sua rotina para conhecer as opções atuais.",
      href: "/planos",
      label: "Pacotes e promoções",
      icon: ListChecks,
    },
    {
      title: "Sua conta cabe no combo?",
      text: "Casa e celular juntos: confira o que entra na conta.",
      href: "/celular-e-internet",
      label: "Casa + celular",
      icon: MessagesSquare,
    },
    {
      title: "O que vale perguntar na conversa?",
      text: "Promoção, fidelidade e benefícios. Cada detalhe importa.",
      href: "/comparar",
      label: "Escolha do plano",
      icon: ShieldCheck,
    },
  ];
  return (
    <div className="wifi-guide-grid">
      {guides.map((g) => (
        <Link key={g.href} href={g.href} className="wifi-guide-card">
          <div className="wifi-guide-icon">
            <g.icon size={29} />
          </div>
          <span className="wifi-eyebrow">{g.label}</span>
          <h3>{g.title}</h3>
          <p>{g.text}</p>
          <span className="wifi-text-link">
            Ver guia <ArrowRight size={16} />
          </span>
        </Link>
      ))}
    </div>
  );
}
