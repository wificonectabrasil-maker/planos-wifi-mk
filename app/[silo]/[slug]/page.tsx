import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import Image from "next/image";
import { localMediaPath } from "@/lib/media/url";
import Link from "next/link";
import { getPublicPostBySlug, getPublicUrlRedirectTarget, listAllPostParams } from "@/lib/db";
import { JsonLd } from "@/components/seo/JsonLd";
import { PostToc } from "@/components/site/PostToc";
import { ArticleNextStep } from "@/components/site/ArticleNextStep";
import { AuthorCard } from "@/components/site/AuthorCard";
import { brandConfig } from "@/brand.config";
import type { PostWithSilo } from "@/lib/types";
import { resolveContentHtmlForRender } from "@/lib/editor/resolveContentHtml";
import { resolvePostCoverAlt, resolvePostCoverUrl } from "@/lib/site/postCover";
import { resolveSiteUrl } from "@/lib/site/url";
import { buildCanonicalUrl, buildPostCanonicalPath, buildSiloCanonicalPath } from "@/lib/seo/canonical";
import { buildPostContentJsonLd } from "@/lib/seo/post-content-schema";
import { DEFAULT_AUTHOR_PROFILE, findCollaboratorByName } from "@/lib/site/collaborators";
import { SITE_DESCRIPTION, SITE_NAME, isStandardAffiliateDisclosure } from "@/lib/site";
import { getCanonicalSiloSlug, getLegacySiloRedirect } from "@/lib/silo-config";

export const revalidate = 3600;
export const dynamic = "force-static";
export const dynamicParams = true;

const getPublishedPost = cache(async (siloSlug: string, postSlug: string) => getPublicPostBySlug(siloSlug, postSlug));
const collaboratorsPageUrl = `${resolveSiteUrl().replace(/\/$/, "")}/colaboradores`;

function normalizeName(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function generateStaticParams() {
  const params = await listAllPostParams();
  return params.map((p) => ({ silo: p.silo, slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ silo: string; slug: string }> }): Promise<Metadata> {
  const { silo, slug } = await params;
  const post = await getPublishedPost(silo, slug);
  if (!post) {
    const redirectSlug = getLegacySiloRedirect(silo);
    return redirectSlug
      ? {
          title: "Artigo",
          alternates: { canonical: `/${redirectSlug}/${slug}` },
          robots: { index: false, follow: true },
        }
      : { title: "Artigo" };
  }

  const metaTitle = post.meta_title ?? post.seo_title ?? post.title;
  const description = post.meta_description ?? SITE_DESCRIPTION;
  const canonicalSiloSlug = getCanonicalSiloSlug(post.silo?.slug ?? silo);
  const canonicalPath = buildPostCanonicalPath(canonicalSiloSlug, slug) ?? `/${canonicalSiloSlug}/${slug}`;
  const siteUrl = resolveSiteUrl();
  const canonicalUrl = buildCanonicalUrl(siteUrl, canonicalPath);
  const coverImage = resolvePostCoverUrl(post);
  const ogImage = post.og_image_url ?? coverImage ?? `${siteUrl}/opengraph-image`;

  return {
    title: metaTitle,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      siteName: SITE_NAME,
      title: metaTitle,
      description,
      type: "article",
      url: canonicalUrl,
      locale: "pt_BR",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? undefined,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

function buildAuthor(post: PostWithSilo) {
  const fallbackName = post.expert_name || post.author_name || DEFAULT_AUTHOR_PROFILE.name;
  const collaborator = findCollaboratorByName(fallbackName);
  const profileUrl = collaborator?.profilePath
    ? new URL(collaborator.profilePath, resolveSiteUrl()).href
    : collaboratorsPageUrl;
  const author: Record<string, unknown> = {
    "@type": !collaborator && fallbackName === DEFAULT_AUTHOR_PROFILE.name ? "Organization" : "Person",
    name: collaborator?.name ?? fallbackName,
    url: profileUrl,
  };

  if (collaborator?.profilePath) author["@id"] = profileUrl;
  author.jobTitle = post.expert_role || collaborator?.siteRole || undefined;
  author.description = post.expert_bio || collaborator?.shortBio || undefined;
  if (post.expert_credentials) author.honorificSuffix = post.expert_credentials;
  if (collaborator?.professionalName && collaborator.professionalName !== author.name) {
    author.alternateName = collaborator.professionalName;
  }
  if (collaborator?.image?.src) author.image = new URL(collaborator.image.src, resolveSiteUrl()).href;
  if (collaborator) author.sameAs = collaborator.links.filter(link => link.platform !== "whatsapp").map(link => link.href);
  return author;
}

function buildReviewedBy(post: PostWithSilo) {
  const reviewedBy = post.reviewed_by?.trim();
  if (!reviewedBy) return undefined;
  const authorName = post.expert_name || post.author_name || DEFAULT_AUTHOR_PROFILE.name;
  if (normalizeName(reviewedBy) === normalizeName(authorName)) return undefined;

  const reviewer: Record<string, any> = { "@type": "Person", name: reviewedBy };
  const collaborator = findCollaboratorByName(reviewedBy);
  if (collaborator?.image?.src) reviewer.image = collaborator.image.src;
  reviewer.url = collaboratorsPageUrl;
  reviewer.sameAs = Array.from(new Set([collaboratorsPageUrl, ...(collaborator?.links?.map((link) => link.href) ?? [])]));
  return reviewer;
}

function buildArticleJsonLd(post: PostWithSilo, canonical: string) {
  const coverImage = resolvePostCoverUrl(post);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    headline: post.title,
    description: post.meta_description ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    image: coverImage ? [coverImage] : undefined,
    author: buildAuthor(post),
    reviewedBy: buildReviewedBy(post),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

function buildBreadcrumbJsonLd(post: PostWithSilo, siteUrl: string, silo: string, canonical: string) {
  const base = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${base}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: post.silo?.name ?? silo,
        item: `${base}${buildSiloCanonicalPath(silo)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: canonical,
      },
    ],
  };
}

export default async function PostPage({ params }: { params: Promise<{ silo: string; slug: string }> }) {
  const { silo, slug } = await params;
  const post = await getPublishedPost(silo, slug);

  if (!post) {
    const redirectSlug = getLegacySiloRedirect(silo);
    if (redirectSlug) permanentRedirect(`/${redirectSlug}/${slug}`);
    const deletedRedirectTarget = await getPublicUrlRedirectTarget(buildPostCanonicalPath(silo, slug)!);
    if (deletedRedirectTarget) permanentRedirect(deletedRedirectTarget);
    return notFound();
  }

  const postSiloSlug = getCanonicalSiloSlug(post.silo?.slug ?? silo);
  if (postSiloSlug !== silo) {
    permanentRedirect(`/${postSiloSlug}/${slug}`);
  }

  const siteUrl = resolveSiteUrl();
  const canonicalPath = buildPostCanonicalPath(postSiloSlug, slug) ?? `/${postSiloSlug}/${slug}`;
  const canonical = buildCanonicalUrl(siteUrl, canonicalPath);

  const articleLd = buildArticleJsonLd(post, canonical);
  const contentHtml = resolveContentHtmlForRender(post);
  const coverImage = resolvePostCoverUrl(post);
  const coverImageAlt = resolvePostCoverAlt(post);

  const rawAuthorName = post.expert_name || post.author_name || "";
  const authorProfile = rawAuthorName ? findCollaboratorByName(rawAuthorName) : DEFAULT_AUTHOR_PROFILE;
  const displayAuthorName = authorProfile?.name || rawAuthorName || DEFAULT_AUTHOR_PROFILE.name;
  const showReviewer =
    Boolean(post.reviewed_by?.trim()) && normalizeName(post.reviewed_by) !== normalizeName(displayAuthorName);
  const shouldShowTopDisclaimer =
    Boolean(post.disclaimer?.trim()) && !isStandardAffiliateDisclosure(post.disclaimer);
  const allowAutomaticFaqSchema =
    (brandConfig as { allowAutomaticFaqSchema?: boolean }).allowAutomaticFaqSchema ?? true;
  const contentLd = buildPostContentJsonLd(post, contentHtml, canonical, { allowAutomaticFaq: allowAutomaticFaqSchema });
  const breadcrumbLd = buildBreadcrumbJsonLd(post, siteUrl, postSiloSlug, canonical);

  const schemaBlocks = [
    articleLd,
    ...contentLd,
    breadcrumbLd,
  ].filter(Boolean);

  return (
    <div className="post-page relative min-h-screen bg-transparent pb-12">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[600px] bg-linear-to-b from-white via-white/200 to-transparent" />

      <section className="relative z-10 bg-transparent">
        <article className="page-in relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-5 md:px-6">
          <header className="space-y-3">
            <nav className="text-[11px] text-(--muted-2)">
              <Link href="/">Home</Link> / <Link href={buildSiloCanonicalPath(postSiloSlug)!}>{post.silo?.name ?? silo}</Link> / {post.title}
            </nav>

            <div>
              <Link
                href={buildSiloCanonicalPath(postSiloSlug)!}
                className="inline-flex items-center rounded-full border border-[rgba(165,119,100,0.3)] bg-white/80 px-3 py-1 text-xs font-semibold text-(--muted-2) hover:text-(--ink)"
              >
                Voltar para {post.silo?.name ?? silo}
              </Link>
            </div>

            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{post.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-(--muted)">
              <div className="flex items-center gap-1">
                <span className="text-(--muted-2)">Por</span>
                <span className="font-semibold text-(--ink)">{displayAuthorName || DEFAULT_AUTHOR_PROFILE.name}</span>
              </div>

              {showReviewer ? (
                <div className="flex items-center gap-1 border-l border-(--border) pl-4">
                  <span className="text-(--muted-2)">Revisão técnica</span>
                  <span className="font-semibold text-(--ink)">{post.reviewed_by}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-1 border-l border-(--border) pl-4">
                <span className="text-(--muted-2)">Atualizado</span>
                <time>
                  {new Date(post.updated_at || post.published_at || new Date()).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>
            </div>
          </header>

          {coverImage ? (
            <div className="mt-6 overflow-hidden rounded-xl">
              <Image
                src={localMediaPath(coverImage, siteUrl)}
                alt={coverImageAlt}
                width={1200}
                height={630}
                priority
                sizes="(max-width: 768px) 100vw, 1200px"
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}
        </article>
      </section>

      <article className="page-in mx-auto max-w-6xl px-4 pt-8 sm:px-5 md:px-6">
        <div className={/<h[23](?:\s|>)/i.test(contentHtml) ? "grid gap-8 md:grid-cols-[232px_minmax(0,1fr)]" : "grid gap-8"}>
          <PostToc contentSelector=".content" title="Índice" />

          <div className={/<h[23](?:\s|>)/i.test(contentHtml) ? "min-w-0 space-y-8 md:col-start-2" : "min-w-0 space-y-8"}>
            {shouldShowTopDisclaimer ? <div className="text-xs italic text-(--muted)">{post.disclaimer}</div> : null}

            <div className="content">
              {contentHtml ? (
                <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
              ) : (
                <p className="text-sm text-(--muted)">
                  Este artigo ainda não tem conteúdo. Abra no <Link href={`/admin/editor/${post.id}`} className="underline">editor</Link>.
                </p>
              )}
            </div>

            <ArticleNextStep />

            {Array.isArray(post.sources) && post.sources.length ? (
              <div className="brand-card rounded-2xl p-6 text-xs text-(--muted)">
                <p className="text-[11px] font-semibold uppercase text-(--muted-2)">Fontes</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {post.sources.map((source: any, index: number) => (
                    <li key={`${source.url}-${index}`}>
                      <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                        {source.label || source.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {authorProfile ? <AuthorCard profile={authorProfile} /> : null}
          </div>
        </div>

        {schemaBlocks.length ? <JsonLd data={schemaBlocks as any} /> : null}
      </article>
    </div>
  );
}
