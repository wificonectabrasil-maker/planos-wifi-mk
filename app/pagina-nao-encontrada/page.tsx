import { PostCard } from "@/components/site/PostCard";
import type { Metadata } from "next";
import { listRelatedPublicPosts } from "@/lib/db";

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

      <section className="system-post-card-grid mt-8">
        {posts.map(post => <PostCard key={post.id} post={post} headingLevel={2} />)}
      </section>
    </main>
  );
}
