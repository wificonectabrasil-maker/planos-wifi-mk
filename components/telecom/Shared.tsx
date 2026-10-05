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
      text: "Nosso atendimento é pelo WhatsApp, em São Paulo por enquanto.",
    },
    {
      icon: ListChecks,
      title: "Conte o que procura",
      text: "Fale do seu bairro, da sua rotina e dos serviços que precisa.",
    },
    {
      icon: MessagesSquare,
      title: "Conheça as opções atuais",
      text: "Pacotes, valores e vantagens são apresentados na conversa, conforme o seu caso.",
    },
  ];
  return (
    <section className="wifi-section wifi-process" id="como-funciona">
      <div className="wifi-container">
        <div className="wifi-section-heading">
          <div>
            <p className="wifi-eyebrow">Tudo começa pelo WhatsApp</p>
            <h2>Uma conversa pra encontrar seu pacote.</h2>
            <p>Confira as opções do momento e tire suas dúvidas antes de decidir.</p>
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
          <p className="wifi-eyebrow">Um pacote que combina com você</p>
          <h2>Vamos conversar sobre a sua rotina?</h2>
          <p>
            Consulte promoções e vantagens de internet, celular e TV. A gente
            ajuda você a comparar as opções e conferir as condições pro seu
            endereço.
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
        Atendimento pelo WhatsApp
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
