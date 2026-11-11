import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PostWithSilo } from "@/lib/types";
import { localMediaPath } from "@/lib/media/url";
import { buildSiloCanonicalPath } from "@/lib/seo/canonical";
import { DEFAULT_AUTHOR_PROFILE, resolveArticleAuthorProfile } from "@/lib/site/collaborators";
import { resolvePostCoverAlt, resolvePostCoverUrl } from "@/lib/site/postCover";
import { resolveSiteUrl } from "@/lib/site/url";
import { isStandardAffiliateDisclosure } from "@/lib/site";
import { ArticleNextStep } from "./ArticleNextStep";
import { AuthorCard } from "./AuthorCard";
import { PostToc } from "./PostToc";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";

const articleConsultation = {
  "operadoras-internet-no-meu-cep": {
    first: "Como verificar a disponibilidade pelo CEP",
    introMarker: "Quer saber quais operadoras de internet atendem seu CEP?",
    label: "Consultar cobertura e promoções no WhatsApp",
    message: "Olá! Quero saber quais operadoras atendem meu endereço e consultar os planos, preços e promoções disponíveis. Podem me ajudar?",
    source: "artigo-cep",
  },
  "como-escolher-plano-internet-residencial": {
    first: "O que conferir primeiro antes de contratar internet para casa?",
    introMarker: "Qual plano de internet vale mais a pena para sua casa?",
    label: "Encontrar meu plano no WhatsApp",
    message: "Olá! Estou procurando internet para minha casa. Quero comparar os planos e promoções disponíveis para meu endereço. Podem me ajudar?",
    source: "artigo-escolher-plano",
  },
  "claro-vivo-tim-internet-residencial": {
    first: "Qual operadora atende o seu endereço com fibra",
    introMarker: "Na WifiConecta, uma pessoa ajuda você a comparar as opções acessíveis",
    label: "Comparar operadoras no WhatsApp",
    message: "Olá! Quero comparar as operadoras e os planos de internet disponíveis para meu endereço. Podem me ajudar?",
    source: "artigo-comparar-operadoras",
  },
  "internet-residencial-barato": {
    first: "O que considerar sobre preço e custo-benefício?",
    introMarker: "Na WifiConecta, uma pessoa ajuda você a consultar os preços e condições",
    label: "Consultar preços no WhatsApp",
    message: "Olá! Quero consultar os preços e promoções de internet disponíveis para meu endereço e comparar as condições. Podem me ajudar?",
    source: "artigo-internet-barata",
  },
  "quantos-mega-de-internet-preciso": {
    first: "Como medir sua velocidade real no dia a dia",
    introMarker: "Para saber quantos mega de internet você precisa",
    label: "Consultar planos para minha casa",
    message: "Olá! Quero comparar as velocidades, preços e planos de internet disponíveis para meu endereço. Podem me ajudar?",
    source: "artigo-quantos-mega",
  },
  "combo-internet-e-celular": {
    first: "O que o combo promete e o que a conta mostra",
    introMarker: "Um combo de internet e celular vale a pena",
    label: "Consultar combos no WhatsApp",
    message: "Olá! Quero consultar combos de internet e celular, preços e condições para meu endereço. Podem me ajudar?",
    source: "artigo-combo-internet-celular",
  },
  "melhor-internet-tv-streaming": {
    first: "O que é internet com streaming incluso?",
    introMarker: "Contratar internet, TV e streaming no mesmo pacote vale a pena",
    label: "Consultar internet, TV e streaming",
    message: "Olá! Quero consultar os pacotes de internet, TV e streaming, preços e condições para meu endereço. Podem me ajudar?",
    source: "artigo-tv-streaming",
  },
  "instalacao-internet-primeira-fatura": {
    first: "Como a internet chega à sua casa até a instalação",
    introMarker: "A instalação de internet residencial começa antes de o técnico aparecer na sua porta",
    label: "Consultar instalação e condições",
    message: "Olá! Quero consultar planos de internet, instalação e condições da primeira fatura para meu endereço. Podem me ajudar?",
    source: "artigo-instalacao-primeira-fatura",
  },
} as const;

function consultationSections(slug: string, html: string) {
  const config = articleConsultation[slug as keyof typeof articleConsultation];
  if (!config || !html.includes(config.introMarker)) return null;
  const first = `<h2>${config.first}</h2>`;
  const start = html.indexOf(first);
  if (start < 0) return null;
  return { config, sections: [html.slice(0, start), html.slice(start)] };
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Shared public article presentation; authentication and publication stay in the routes. */
export function PostArticle({ post, contentHtml, siloSlug, editorHref, children }: {
  post: PostWithSilo;
  contentHtml: string;
  siloSlug: string;
  editorHref?: string;
  children?: ReactNode;
}) {
  const rawAuthorName = post.expert_name || post.author_name || "";
  const authorProfile = resolveArticleAuthorProfile(rawAuthorName);
  const displayAuthorName = authorProfile?.name || rawAuthorName || DEFAULT_AUTHOR_PROFILE.name;
  const showReviewer = Boolean(post.reviewed_by?.trim()) && normalizeName(post.reviewed_by) !== normalizeName(displayAuthorName);
  const coverImage = resolvePostCoverUrl(post);
  const siloPath = buildSiloCanonicalPath(siloSlug);
  const hasHeadings = /<h[23](?:\s|>)/i.test(contentHtml);
  const showDisclaimer = Boolean(post.disclaimer?.trim()) && !isStandardAffiliateDisclosure(post.disclaimer);
  const updatedAt = post.updated_at || post.published_at;
  const updatedDate = updatedAt ? new Date(updatedAt) : null;
  const consultation = siloSlug === "planos-de-internet" ? consultationSections(post.slug, contentHtml) : null;

  return (
    <article className="post-page system-post-article">
      <div className="wifi-container system-post-container">
        <header className="system-post-header">
          <nav className="system-post-breadcrumb" aria-label="Caminho do artigo">
            <Link prefetch={false} href="/">Início</Link><span aria-hidden="true">/</span>
            {siloPath ? <><Link prefetch={false} href={siloPath}>{post.silo?.name ?? siloSlug}</Link><span aria-hidden="true">/</span></> : null}
            <span aria-current="page">{post.title}</span>
          </nav>
          {siloPath ? <Link prefetch={false} href={siloPath} className="system-post-back">Voltar para {post.silo?.name ?? siloSlug}</Link> : null}
          <h1 className="system-post-title">{post.title}</h1>
          <div className="system-post-meta">
            <span>Por <strong>{displayAuthorName}</strong></span>
            {showReviewer ? <span>Revisão técnica <strong>{post.reviewed_by}</strong></span> : null}
            {updatedDate && !Number.isNaN(updatedDate.getTime()) ? (
              <span>Atualizado <time dateTime={updatedDate.toISOString()}>{updatedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</time></span>
            ) : null}
          </div>
          {coverImage ? (
            <div className="system-post-cover">
              <Image src={localMediaPath(coverImage, resolveSiteUrl())} alt={resolvePostCoverAlt(post)} width={1200} height={630} priority sizes="(max-width: 768px) 100vw, 1180px" />
            </div>
          ) : null}
        </header>

        <div className={`system-post-body${hasHeadings ? " system-post-with-toc" : ""}`}>
          {hasHeadings ? <PostToc key={post.id} contentSelector=".system-post-content" title="Índice" portalThemeClassName="wifi-site" /> : null}
          <div className="system-post-main">
            {showDisclaimer ? <p className="system-post-disclaimer">{post.disclaimer}</p> : null}
            <div className="content system-post-content">
              {consultation ? consultation.sections.map((section, index) => <div key={index}>
                <div dangerouslySetInnerHTML={{ __html: section }} />
                {index === 0 ? <div className="wifi-article-consultation"><WhatsAppCTA source={`${consultation.config.source}-inicio`} label={consultation.config.label} message={consultation.config.message} /></div> : null}
              </div>) : contentHtml ? <div dangerouslySetInnerHTML={{ __html: contentHtml }} /> : (
                <p>Este artigo ainda não tem conteúdo.{editorHref ? <> Abra no <Link href={editorHref}>editor</Link>.</> : null}</p>
              )}
            </div>
            {consultation ? <aside className="system-article-next-step" aria-label="Consultar com a WifiConecta"><h2>Vamos consultar as opções para sua casa?</h2><p>Conte o que precisa. A equipe ajuda a verificar cobertura, planos e condições para o endereço.</p><WhatsAppCTA source={`${consultation.config.source}-conclusao`} label={consultation.config.label} message={consultation.config.message} /></aside> : <ArticleNextStep />}
            {Array.isArray(post.sources) && post.sources.length ? (
              <section className="system-post-sources" aria-label="Fontes do artigo">
                <h2>Fontes</h2>
                <ul>{post.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label || source.url}</a></li>)}</ul>
              </section>
            ) : null}
            {authorProfile ? <AuthorCard profile={authorProfile} /> : null}
          </div>
        </div>
        {children}
      </div>
    </article>
  );
}
