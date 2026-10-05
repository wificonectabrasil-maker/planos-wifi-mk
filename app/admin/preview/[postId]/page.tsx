import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetPostById } from "@/lib/db";
import { resolveContentHtmlForRender } from "@/lib/editor/resolveContentHtml";
import { PostToc } from "@/components/site/PostToc";
import { DEFAULT_AUTHOR_PROFILE, findCollaboratorByName } from "@/lib/site/collaborators";
import { resolvePostCoverAlt, resolvePostCoverUrl } from "@/lib/site/postCover";
import { buildPostCanonicalPath, buildSiloCanonicalPath } from "@/lib/seo/canonical";
import { isUuid } from "@/lib/uuid";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveContentHtml(post: NonNullable<Awaited<ReturnType<typeof adminGetPostById>>>) {
  return resolveContentHtmlForRender(post);
}

function statusLabel(post: NonNullable<Awaited<ReturnType<typeof adminGetPostById>>>) {
  const status = post.status ?? (post.published ? "published" : "draft");
  if (status === "published") return "Publicado";
  if (status === "review") return "Revisão";
  if (status === "scheduled") return "Agendado";
  return "Rascunho";
}

function normalizeName(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default async function AdminPreviewPage({ params }: { params: Promise<{ postId: string }> }) {
  await requireAdminSession();
  const { postId } = await params;

  if (!isUuid(postId)) return notFound();

  const post = await adminGetPostById(postId);
  if (!post) return notFound();

  const contentHtml = resolveContentHtml(post);
  const rawAuthorName = post.expert_name || post.author_name || "";
  const authorProfile = findCollaboratorByName(rawAuthorName) ?? DEFAULT_AUTHOR_PROFILE;
  const displayAuthorName = authorProfile?.name || rawAuthorName || DEFAULT_AUTHOR_PROFILE.name;
  const showReviewer =
    Boolean(post.reviewed_by?.trim()) && normalizeName(post.reviewed_by) !== normalizeName(displayAuthorName);
  const showProfessionalName =
    Boolean(authorProfile.professionalName) &&
    normalizeName(authorProfile.professionalName) !== normalizeName(authorProfile.name);
  const publicPath = buildPostCanonicalPath(post.silo?.slug ?? null, post.slug);
  const siloPath = buildSiloCanonicalPath(post.silo?.slug ?? null);
  const coverImage = resolvePostCoverUrl(post);
  const coverImageAlt = resolvePostCoverAlt(post);
  const postSiloSlug = post.silo?.slug ?? "";

  return (
    <>
      <SiteHeader />

      {/* ── Preview admin banner ── */}
      <div className="sticky top-0 z-[60] border-b border-amber-300/60 bg-amber-50/90 backdrop-blur dark:border-amber-700/60 dark:bg-amber-950/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Preview interno (admin)
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Status: <strong className="text-amber-800 dark:text-amber-200">{statusLabel(post)}</strong>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/editor/${post.id}`}
              className="rounded-lg border border-amber-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm transition hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800/80 dark:text-amber-200 dark:hover:bg-slate-700"
            >
              Voltar ao editor
            </Link>
            {publicPath ? (
              <a
                href={publicPath}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-amber-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm transition hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800/80 dark:text-amber-200 dark:hover:bg-slate-700"
              >
                Abrir URL pública
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Post content (same layout as published posts) ── */}
      <div className="post-page relative min-h-screen pb-12 bg-slate-50 dark:bg-slate-950">
        {/* Elementos gráficos de fundo intercalados */}
        <div className="bg-pattern-grid" />
        <div className="bg-pattern-dots" />
        <div className="bg-pattern-diagonals" />

        <section className="relative z-10 bg-transparent">
          <article className="page-in relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-5 md:px-6">
            <header className="space-y-3">
              <nav className="text-[11px] text-slate-400 dark:text-slate-500">
                <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Home</Link>
                {" / "}
                <Link href={siloPath ?? "/"} className="hover:text-slate-600 dark:hover:text-slate-300">
                  {post.silo?.name ?? "Sem silo"}
                </Link>
                {" / "}
                {post.title}
              </nav>

              {postSiloSlug ? (
                <div>
                  <Link
                    href={`/${postSiloSlug}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Voltar para {post.silo?.name ?? postSiloSlug}
                  </Link>
                </div>
              ) : null}

              <h1 className="post-title text-slate-900 dark:text-slate-50">
                {post.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 dark:text-slate-500">Por</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {displayAuthorName || DEFAULT_AUTHOR_PROFILE.name}
                  </span>
                </div>

                {showReviewer ? (
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-4 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500">Revisão técnica</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{post.reviewed_by}</span>
                  </div>
                ) : null}

                <div className="flex items-center gap-1 border-l border-slate-200 pl-4 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-500">Atualizado</span>
                  <time className="text-slate-600 dark:text-slate-300">
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
                <img
                  src={coverImage}
                  alt={coverImageAlt}
                  className="h-auto w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
          </article>
        </section>

        <article className="page-in mx-auto max-w-6xl px-4 pt-8 sm:px-5 md:px-6">
          <div className="grid gap-8 md:grid-cols-[232px_minmax(0,1fr)]">
            <PostToc contentSelector=".content" title="Índice" />

            <div className="space-y-8">
              <div className="content">
                {contentHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Este artigo ainda não tem conteúdo. Abra no{" "}
                    <a href={`/admin/editor/${post.id}`} className="underline">
                      editor
                    </a>
                    .
                  </p>
                )}
              </div>

              {Array.isArray(post.sources) && post.sources.length ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400">
                  <p className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">Fontes</p>
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

              {authorProfile ? (
                <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/30 md:p-6">
                  <div className="grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                    <img
                      src={authorProfile.image.src}
                      alt={authorProfile.image.alt}
                      width={authorProfile.image.width}
                      height={authorProfile.image.height}
                      className="h-24 w-24 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                      loading="lazy"
                    />
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Autor / Revisão técnica
                      </p>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {authorProfile.name}
                      </h2>
                      {showProfessionalName ? (
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          {authorProfile.professionalName}
                        </p>
                      ) : null}
                      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {authorProfile.expertBoxShort}
                      </p>
                      <div className="pt-1">
                        <Link href="/sobre" className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition duration-300">
                          Conhecer o autor
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </article>
      </div>

      <SiteFooter />
    </>
  );
}
