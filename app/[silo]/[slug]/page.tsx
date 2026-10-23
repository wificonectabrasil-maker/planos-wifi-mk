import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { getPublicPostBySlug, getPublicUrlRedirectTarget, listAllPostParams } from "@/lib/db";
import { JsonLd } from "@/components/seo/JsonLd";
import { PostArticle } from "@/components/site/PostArticle";
import { brandConfig } from "@/brand.config";
import type { PostWithSilo } from "@/lib/types";
import { resolveContentHtmlForRender } from "@/lib/editor/resolveContentHtml";
import { resolvePostCoverUrl } from "@/lib/site/postCover";
import { resolveSiteUrl } from "@/lib/site/url";
import { buildCanonicalUrl, buildPostCanonicalPath, buildSiloCanonicalPath } from "@/lib/seo/canonical";
import { buildPostContentJsonLd } from "@/lib/seo/post-content-schema";
import { DEFAULT_AUTHOR_PROFILE, findCollaboratorByName, resolveArticleAuthorProfile, USE_DEFAULT_ARTICLE_AUTHOR } from "@/lib/site/collaborators";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
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
  const collaborator = resolveArticleAuthorProfile(fallbackName);
  const profileUrl = collaborator?.profilePath
    ? new URL(collaborator.profilePath, resolveSiteUrl()).href
    : collaboratorsPageUrl;
  const author: Record<string, unknown> = {
    "@type": !collaborator && fallbackName === DEFAULT_AUTHOR_PROFILE.name ? "Organization" : "Person",
    name: collaborator?.name ?? fallbackName,
    url: profileUrl,
  };

  if (collaborator?.profilePath) author["@id"] = profileUrl;
  author.jobTitle = (USE_DEFAULT_ARTICLE_AUTHOR ? collaborator?.siteRole : post.expert_role || collaborator?.siteRole) || undefined;
  author.description = (USE_DEFAULT_ARTICLE_AUTHOR ? collaborator?.shortBio : post.expert_bio || collaborator?.shortBio) || undefined;
  if (!USE_DEFAULT_ARTICLE_AUTHOR && post.expert_credentials) author.honorificSuffix = post.expert_credentials;
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
  const rawAuthorName = post.expert_name || post.author_name || DEFAULT_AUTHOR_PROFILE.name;
  const authorName = resolveArticleAuthorProfile(rawAuthorName)?.name || rawAuthorName;
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
    <PostArticle post={post} contentHtml={contentHtml} siloSlug={postSiloSlug}>
      {schemaBlocks.length ? <JsonLd data={schemaBlocks} /> : null}
    </PostArticle>
  );
}
