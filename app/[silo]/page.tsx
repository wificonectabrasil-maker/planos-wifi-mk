import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicPostsBySilo, getPublicSiloBySlug, listAllSiloSlugs } from "@/lib/db";
import type { Post } from "@/lib/types";
import { resolveSiteUrl } from "@/lib/site/url";
import { resolvePostCoverAlt, resolvePostCoverUrl } from "@/lib/site/postCover";
import { buildCanonicalUrl, buildSiloCanonicalPath } from "@/lib/seo/canonical";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { getCanonicalSiloSlug, getLegacySiloRedirect } from "@/lib/silo-config";

export const revalidate = 3600;
export const dynamic = "force-static";
export const dynamicParams = true;

const getCachedSilo = cache(async (siloSlug: string) => getPublicSiloBySlug(siloSlug));
const getCachedPosts = cache(async (siloSlug: string) => getPublicPostsBySilo(siloSlug));

function toMetaDescription(value: string | null | undefined): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).trim()}...`;
}

function isPillar(post: Post): boolean {
  return post.silo_role === "PILLAR" || post.pillar_rank === 1;
}

function resolveOrder(post: Post): number {
  const directOrder =
    typeof post.silo_order === "number" && Number.isFinite(post.silo_order) ? Math.max(0, Math.trunc(post.silo_order)) : null;
  if (directOrder !== null) return directOrder;

  const legacyOrder =
    typeof post.silo_group_order === "number" && Number.isFinite(post.silo_group_order)
      ? Math.max(0, Math.trunc(post.silo_group_order))
      : null;
  if (legacyOrder !== null) return legacyOrder;

  return 0;
}

function sortHubPosts(a: Post, b: Post): number {
  const pillarA = isPillar(a);
  const pillarB = isPillar(b);
  if (pillarA !== pillarB) return pillarA ? -1 : 1;

  const orderA = resolveOrder(a);
  const orderB = resolveOrder(b);
  if (orderA !== orderB) return orderA - orderB;

  const dateA = new Date(a.updated_at || a.published_at || 0).getTime();
  const dateB = new Date(b.updated_at || b.published_at || 0).getTime();
  if (dateA !== dateB) return dateB - dateA;

  return (a.title || "").localeCompare(b.title || "", "pt-BR");
}

function formatPostDate(post: Post): string {
  const value = post.published_at || post.updated_at;
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resolveSummary(post: Post): string {
  const summary = post.meta_description || post.excerpt;
  if (summary && summary.trim().length > 0) return summary.trim();
  return "Abrir post completo.";
}

export async function generateStaticParams() {
  const slugs = await listAllSiloSlugs();
  return slugs.map((slug) => ({ silo: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ silo: string }> }): Promise<Metadata> {
  const { silo } = await params;
  const currentSilo = await getCachedSilo(silo);
  if (!currentSilo) {
    const redirectSlug = getLegacySiloRedirect(silo);
    return redirectSlug
      ? {
          title: "Silo",
          alternates: { canonical: `/${redirectSlug}` },
          robots: { index: false, follow: true },
        }
      : { title: "Silo" };
  }

  const canonicalSiloSlug = getCanonicalSiloSlug(currentSilo.slug);
  const canonicalPath = buildSiloCanonicalPath(canonicalSiloSlug) ?? `/${canonicalSiloSlug}`;
  const siteUrl = resolveSiteUrl();
  const canonicalUrl = buildCanonicalUrl(siteUrl, canonicalPath);
  const description = toMetaDescription(currentSilo.meta_description ?? currentSilo.description ?? SITE_DESCRIPTION);
  const socialImage = currentSilo.hero_image_url || `${siteUrl}/opengraph-image`;

  return {
    title: currentSilo.name,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      url: canonicalUrl,
      title: currentSilo.name,
      description,
      locale: "pt_BR",
      images: socialImage ? [socialImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: currentSilo.name,
      description,
      images: socialImage ? [socialImage] : undefined,
    },
  };
}

export default async function PublicSiloHubPage({ params }: { params: Promise<{ silo: string }> }) {
  const { silo } = await params;
  const currentSilo = await getCachedSilo(silo);
  if (!currentSilo) {
    const redirectSlug = getLegacySiloRedirect(silo);
    if (redirectSlug) permanentRedirect(`/${redirectSlug}`);
    return notFound();
  }

  const canonicalSiloSlug = getCanonicalSiloSlug(currentSilo.slug);
  if (canonicalSiloSlug !== silo) {
    permanentRedirect(`/${canonicalSiloSlug}`);
  }

  const allPosts = await getCachedPosts(canonicalSiloSlug);
  const posts = allPosts.slice().sort(sortHubPosts);
  if (posts.length === 0) {
    return notFound();
  }

  const pillarPost = posts.find((post) => isPillar(post)) ?? null;

  const siteUrl = resolveSiteUrl();
  const base = siteUrl.replace(/\/$/, "");

  const breadcrumbLd = {
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
        name: currentSilo.name,
        item: `${base}/${canonicalSiloSlug}`,
      },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: currentSilo.name,
    description: currentSilo.meta_description ?? currentSilo.description ?? undefined,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: post.title,
        url: `${siteUrl}/${canonicalSiloSlug}/${post.slug}`,
      })),
    },
  };

  return (
    <div className="space-y-8">
      <section className="brand-card rounded-3xl p-6 md:p-8">
        <nav className="text-[11px] text-(--muted-2)">
          <Link href="/">Home</Link> / <span>{currentSilo.name}</span>
        </nav>

        <div className={`mt-4 grid gap-6 ${pillarPost ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] lg:items-start" : ""}`}>
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">{currentSilo.name}</h1>

            {currentSilo.description ? <p className="mt-3 text-sm text-(--muted)">{currentSilo.description}</p> : null}

            {currentSilo.pillar_content_html ? (
              <div
                className="content mt-5 w-full max-w-none text-(--muted)"
                dangerouslySetInnerHTML={{ __html: currentSilo.pillar_content_html }}
              />
            ) : null}
          </div>

          {pillarPost ? (
            <aside className="rounded-2xl border border-[rgba(165,119,100,0.26)] bg-white/80 p-5 shadow-[0_12px_30px_rgba(43,44,48,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-(--muted-2)">Comece por aqui</p>
              <h2 className="mt-2 text-xl font-semibold text-(--ink)">
                <Link href={`/${canonicalSiloSlug}/${pillarPost.slug}`} className="hover:text-(--brand-hot)">
                  {pillarPost.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-(--muted)">{resolveSummary(pillarPost)}</p>
              <Link
                href={`/${canonicalSiloSlug}/${pillarPost.slug}`}
                className="mt-4 inline-flex items-center rounded-xl bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Ver post
              </Link>
            </aside>
          ) : null}
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="brand-card rounded-2xl p-6 text-sm text-(--muted)">
          Estamos preparando os primeiros posts deste tema.
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-(--ink)">Mais posts deste tema</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post, index) => {
              const cover = resolvePostCoverUrl(post);
              const coverAlt = resolvePostCoverAlt(post);

              return (
                <article
                  key={post.id}
                  className="brand-card group overflow-hidden rounded-2xl border border-[rgba(165,119,100,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(43,44,48,0.18)]"
                >
                  <Link href={`/${canonicalSiloSlug}/${post.slug}`} className="block">
                    <div className="relative aspect-square overflow-hidden">
                      {cover ? (
                        <img
                          src={cover}
                          alt={coverAlt}
                          loading={index < 2 ? "eager" : "lazy"}
                          fetchPriority={index === 0 ? "high" : "auto"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="h-full w-full bg-linear-to-br from-[rgba(241,188,153,0.55)] via-[rgba(255,255,255,0.9)] to-[rgba(19,104,99,0.14)]" />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[rgba(22,22,22,0.34)] via-[rgba(22,22,22,0.04)] to-transparent" />

                      <div className="absolute left-3 top-3 flex items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-white/90 px-2.5 py-1 font-semibold text-(--ink)">
                          {isPillar(post) ? "Principal" : "Post"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-3 text-[11px] text-(--muted-2)">
                        <span className="truncate">/{canonicalSiloSlug}/{post.slug}</span>
                        {formatPostDate(post) ? <span className="shrink-0">{formatPostDate(post)}</span> : null}
                      </div>

                      <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-(--ink) transition-colors group-hover:text-(--brand-hot)">
                        {post.title}
                      </h3>

                      <p className="line-clamp-3 text-sm leading-relaxed text-(--muted)">
                        {resolveSummary(post)}
                      </p>

                      <span className="inline-flex items-center rounded-lg border border-[rgba(165,119,100,0.28)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-(--ink) transition group-hover:border-(--brand-hot) group-hover:text-(--brand-hot)">
                        Ver post
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <JsonLd data={[collectionLd, breadcrumbLd]} />
    </div>
  );
}
