import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Gamepad2,
  House,
  Laptop,
  MonitorPlay,
  Smartphone,
  Wifi,
} from "lucide-react";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { PackageInterests } from "@/components/telecom/PackageInterests";
import { HeroVideoBackground } from "@/components/telecom/HeroVideoBackground";
import {
  ContractProcess,
  FinalCTA,
  GuideCards,
  TrustStrip,
} from "@/components/telecom/Shared";
import { operators } from "@/lib/telecom/catalog";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveSiteUrl } from "@/lib/site/url";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Planos de internet para sua casa, celular e TV",
  description:
    "Uma pessoa da WifiConecta ajuda você a escolher internet, celular e TV e encaminhar seu pedido. Atendimento pelo WhatsApp em São Paulo, com condições para seu endereço.",
  alternates: { canonical: "/" },
};
export default async function Home() {
  const categories = [
    {
      icon: House,
      title: "Internet pra casa",
      text: "Sua rotina conectada",
      href: "/internet-residencial",
    },
    {
      icon: Smartphone,
      title: "Internet + celular",
      text: "Dentro e fora de casa",
      href: "/celular-e-internet",
    },
    {
      icon: MonitorPlay,
      title: "TV e streaming",
      text: "Seu próximo play",
      href: "/tv-e-streaming",
    },
    {
      icon: Building2,
      title: "Pra sua empresa",
      text: "Conexão pro trabalho",
      href: "/internet-empresarial",
    },
  ];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${resolveSiteUrl()}/#organization`,
              name: "WifiConecta",
              url: resolveSiteUrl(),
              logo: `${resolveSiteUrl()}/brand-logo.svg`,
            },
            {
              "@type": "WebSite",
              name: "WifiConecta",
              url: resolveSiteUrl(),
              inLanguage: "pt-BR",
            },
          ],
        }}
      />
      <link rel="preload" as="image" href="/images/hero-claro-poster.webp" fetchPriority="high" />
      <section className="wifi-hero wifi-hero-with-video">
        <HeroVideoBackground />
        <div className="wifi-container wifi-hero-grid wifi-hero-video-layout">
          <div className="wifi-hero-copy">
            <p className="wifi-eyebrow">
              <span className="wifi-eyebrow-dot" /> ATENDIMENTO EM SÃO PAULO
            </p>
            <h1>
              Internet pra sua casa.
              <br />
              <em>
                Sem complicar o pedido.
              </em>
            </h1>
            <p className="wifi-hero-description">
              Uma pessoa da nossa equipe entende sua rotina, apresenta as
              opções pro seu endereço e ajuda a encaminhar o pedido.
            </p>
            <div className="wifi-hero-actions">
              <WhatsAppCTA
                source="hero"
                className="wifi-hero-whatsapp"
                label="Ver promoções no WhatsApp"
                fallbackLabel="Atendimento pelo WhatsApp"
              />
              <p className="wifi-whatsapp-note">Atendimento com uma pessoa, pelo WhatsApp. São Paulo, por enquanto.</p>
              <Link href="/comparar" className="wifi-text-link">
                Quer uma ajuda pra escolher? Veja como funciona{" "}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <TrustStrip />
      <section className="wifi-categories wifi-container">
        <div className="wifi-section-heading">
          <div>
            <p className="wifi-eyebrow">O que você procura hoje?</p>
            <h2>Tem um caminho pra cada rotina.</h2>
          </div>
        </div>
        <div className="wifi-category-grid">
          {categories.map((c) => (
            <Link href={c.href} key={c.href} className="wifi-category-card">
              <span>
                <c.icon size={25} />
              </span>
              <div>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </section>
      <PackageInterests />
      <section className="wifi-operator-section">
        <div className="wifi-container">
          <div>
            <p className="wifi-eyebrow">Opções para o seu endereço</p>
            <h2>A escolha também passa pela operadora.</h2>
            <p>Trabalhamos com Claro, Vivo, TIM e provedores de bairro. A equipe confere quais serviços estão disponíveis onde você mora.</p>
          </div>
          <div className="wifi-operator-list">
            {operators.map((o) => (
              <Link href={`/operadoras/${o.slug}`} key={o.slug}>
                <strong>{o.name}</strong>
                <span>
                  Conhecer serviços <ArrowRight size={13} />
                </span>
              </Link>
            ))}
            <Link href="/operadoras#provedores">
              <strong>Provedores de bairro</strong>
              <span>Conhecer opções <ArrowRight size={13} /></span>
            </Link>
          </div>
        </div>
      </section>
      <section className="wifi-section wifi-container wifi-lifestyle">
        <div className="wifi-lifestyle-heading">
          <p className="wifi-eyebrow">A internet tem que acompanhar você</p>
          <h2>
            Uma conexão pra
            <br />acompanhar o seu dia.
          </h2>
          <p>
            Uma reunião que importa. O filme de sexta. O jogo com os amigos.
            Escolha olhando pro que acontece na sua casa.
          </p>
          <WhatsAppCTA source="home-routine" interest="Um pacote adequado à minha rotina" label="Me ajudar a escolher no WhatsApp" />
        </div>
        <div className="wifi-use-grid">
          {[
            {
              icon: Laptop,
              title: "Trabalhar e estudar",
              text: "Confira upload, chamadas de vídeo e a conexão no seu cantinho de trabalho.",
            },
            {
              icon: MonitorPlay,
              title: "Dar o play",
              text: "Considere quantas telas ficam ligadas e o que está incluído no pacote.",
            },
            {
              icon: Gamepad2,
              title: "Entrar no jogo",
              text: "Latência e estabilidade contam. Mais Mega, sozinho, não resolve tudo.",
            },
            {
              icon: Wifi,
              title: "Conectar a casa",
              text: "O roteador e a distribuição do sinal precisam entrar na conversa.",
            },
          ].map((u) => (
            <div key={u.title}>
              <u.icon size={27} />
              <h3>{u.title}</h3>
              <p>{u.text}</p>
            </div>
          ))}
        </div>
      </section>
      <ContractProcess />
      <section className="wifi-section wifi-container">
        <div className="wifi-section-heading">
          <div>
            <p className="wifi-eyebrow">Escolher bem começa por entender</p>
            <h2>Menos dúvida. Mais clareza.</h2>
            <p>Guias para olhar além da propaganda e fazer uma escolha sua.</p>
          </div>
          <Link href="/blog" className="wifi-text-link">
            Ir para dicas e guias <ArrowRight size={17} />
          </Link>
        </div>
        <GuideCards />
      </section>
      <FinalCTA />
    </>
  );
}
