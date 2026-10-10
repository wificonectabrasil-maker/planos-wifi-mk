import Link from "next/link";
import { buildPostCanonicalPath } from "@/lib/seo/canonical";
import type { PublicHomePost } from "@/lib/types";
function Articles({ posts }: { posts: PublicHomePost[] }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={buildPostCanonicalPath(post.silo?.slug, post.slug) ?? `/${post.slug}`}
          className="brand-card rounded-2xl p-5"
        >
          <p className="text-xs text-(--muted-2)">{post.silo?.name}</p>
          <h3 className="mt-2 font-semibold">{post.title}</h3>
          <p className="mt-3 text-sm text-(--muted-2)">
            {post.meta_description}
          </p>
        </Link>
      ))}
    </div>
  );
}
export function HomeClient({
  posts,
  popular,
  query,
}: {
  posts: PublicHomePost[];
  popular: PublicHomePost[];
  query: string;
}) {
  return (
    <>
      <section data-home-scroll>
        <h2 className="text-2xl font-semibold">
          {query ? "Resultados para “" + query + "”" : "Últimos artigos"}
        </h2>
        {posts.length ? (
          <Articles posts={posts} />
        ) : (
          <p className="mt-4 text-(--muted-2)">
            {query
              ? "Nenhum artigo encontrado."
              : "Os artigos aparecerão aqui após a primeira publicação."}
          </p>
        )}
      </section>
      {!query && popular.length ? (
        <section data-home-scroll>
          <h2 className="text-2xl font-semibold">Mais lidos nesta semana</h2>
          <Articles posts={popular} />
        </section>
      ) : null}
    </>
  );
}
