import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import { buildCanonicalUrl, buildPostCanonicalPath } from "@/lib/seo/canonical";
import { ArticleShare } from "./ArticleShare";
import { localMediaPath } from "@/lib/media/url";
import { resolvePostCoverAlt, resolvePostCoverUrl } from "@/lib/site/postCover";
import { resolveSiteUrl } from "@/lib/site/url";
import { DEFAULT_AUTHOR_PROFILE, resolveArticleAuthorProfile } from "@/lib/site/collaborators";
import type { Post, Silo } from "@/lib/types";

type CardSilo = Pick<Silo, "slug" | "name">;
type CardPost = Pick<Post, "id" | "title" | "slug"> & Partial<Pick<Post,
  "meta_description" | "excerpt" | "hero_image_url" | "hero_image_alt" | "cover_image" | "og_image_url" |
  "author_name" | "expert_name" | "published_at" | "updated_at"
>> & { silo?: CardSilo | null };

/** One public card for hubs, recommendations, search and article listings. */
export function PostCard({ post, silo = post.silo, pillar = false, headingLevel = 3 }: {
  post: CardPost;
  silo?: CardSilo | null;
  pillar?: boolean;
  headingLevel?: 2 | 3;
}) {
  const href = buildPostCanonicalPath(silo?.slug, post.slug) ?? `/${post.slug}`;
  const cover = resolvePostCoverUrl(post);
  const imageSrc = cover ? localMediaPath(cover, resolveSiteUrl()) : null;
  const description = post.meta_description?.trim() || post.excerpt?.trim() || "Confira as orientações no artigo completo.";
  const rawAuthor = post.expert_name || post.author_name;
  const author = resolveArticleAuthorProfile(rawAuthor)?.name || rawAuthor || DEFAULT_AUTHOR_PROFILE.name;
  const rawDate = post.published_at || post.updated_at;
  const date = rawDate ? new Date(rawDate) : null;
  const hasDate = date && !Number.isNaN(date.getTime());
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="system-post-card" aria-label={post.title}>
      <Link prefetch={false} href={href} className="system-post-card-link" aria-label={`Ler artigo: ${post.title}`}>
        <div className="system-post-card-cover">
          {imageSrc ? <Image src={imageSrc} alt={resolvePostCoverAlt(post)} width={720} height={405}
            sizes="(max-width: 800px) 100vw, (max-width: 1250px) 50vw, 580px"
            unoptimized={/^https?:\/\//i.test(imageSrc)} /> : (
            <span className="system-post-card-placeholder"><ImageIcon size={32} aria-hidden="true" /><span>Artigo sem imagem de capa</span></span>
          )}
        </div>
        <div className="system-post-card-body">
          <p className="system-post-card-category">{silo?.name || "Artigo"}{pillar ? <span>Guia principal</span> : null}</p>
          <Heading className="system-post-card-title">{post.title}</Heading>
          <p className="system-post-card-description">{description}</p>
          <div className="system-post-card-meta">
            <span>Por {author}</span>
            {hasDate ? <span>{post.published_at ? "Publicado em " : "Atualizado em "}<time dateTime={date.toISOString()}>{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}</time></span> : null}
          </div>
          <span className="system-post-card-action">Ler artigo <ArrowRight size={16} aria-hidden="true" /></span>
        </div>
      </Link>
      <ArticleShare title={post.title} url={buildCanonicalUrl(resolveSiteUrl(), href)} />
    </article>
  );
}

