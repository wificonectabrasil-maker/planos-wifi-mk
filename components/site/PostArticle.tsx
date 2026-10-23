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
              {contentHtml ? <div dangerouslySetInnerHTML={{ __html: contentHtml }} /> : (
                <p>Este artigo ainda não tem conteúdo.{editorHref ? <> Abra no <Link href={editorHref}>editor</Link>.</> : null}</p>
              )}
            </div>
            <ArticleNextStep />
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
