import Link from "next/link";
import type { Metadata } from "next";
import { listRelatedPublicPosts } from "@/lib/db";
import { buildPostCanonicalPath } from "@/lib/seo/canonical";
import { resolvePostCoverAlt, resolvePostCoverUrl } from "@/lib/site/postCover";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pagina nao encontrada",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function MissingContentPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const sourcePath = typeof from === "string" ? from : "";
  const posts = await listRelatedPublicPosts(sourcePath, 6);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
      <section className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--muted-2)">
          Pagina nao encontrada
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-(--ink) md:text-5xl">
          Mas temos conteudo que pode ser do seu interesse
        </h1>
        <p className="mt-4 text-sm leading-7 text-(--muted)">
          Esta URL foi removida, reorganizada ou nao esta mais disponivel. Separamos alguns conteudos relacionados
          para continuar a navegacao sem perder o contexto.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const href = buildPostCanonicalPath(post.silo?.slug ?? null, post.slug) ?? `/${post.slug}`;
          const coverImage = resolvePostCoverUrl(post);
          return (
            <Link
              key={post.id}
              href={href}
              className="group overflow-hidden rounded-2xl border border-[rgba(165,119,100,0.22)] bg-white/80 shadow-[0_12px_28px_rgba(43,44,48,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(43,44,48,0.12)]"
            >
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={resolvePostCoverAlt(post)}
                  className="h-36 w-full object-cover"
                />
              ) : null}
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
                  {post.silo?.name ?? "Conteudo"}
                </p>
                <h2 className="mt-2 text-lg font-semibold leading-snug text-(--ink) group-hover:text-(--brand-hot)">
                  {post.title}
                </h2>
                {post.meta_description ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-(--muted)">
                    {post.meta_description}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
