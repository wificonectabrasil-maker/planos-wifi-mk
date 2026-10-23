import { PostCard } from "./PostCard";
import type { PublicHomePost } from "@/lib/types";
function Articles({ posts }: { posts: PublicHomePost[] }) {
  return (
    <div className="system-post-card-grid mt-4">
      {posts.map(post => <PostCard key={post.id} post={post} />)}
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
