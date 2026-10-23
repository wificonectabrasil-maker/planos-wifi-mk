"use client";
import { PostCard } from "./PostCard";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import type { PublicHomePost } from "@/lib/types";

type HomeSearchResultsProps = {
  posts: PublicHomePost[];
  maxResults?: number;
};

function normalize(text: string | null | undefined) {
  return (text ?? "").toLocaleLowerCase("pt-BR").trim();
}

function matchesQuery(post: PublicHomePost, query: string) {
  const needle = normalize(query);
  if (!needle) return false;

  return (
    normalize(post.title).includes(needle) ||
    normalize(post.target_keyword).includes(needle) ||
    normalize(post.meta_description).includes(needle) ||
    normalize(post.silo?.name).includes(needle)
  );
}

export function HomeSearchResults({ posts, maxResults = 10 }: HomeSearchResultsProps) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  const results = useMemo(() => {
    if (!query) return [];
    return posts.filter((post) => matchesQuery(post, query)).slice(0, maxResults);
  }, [posts, query, maxResults]);

  if (!query) return null;

  return (
    <section className="space-y-4">
      <BrandBeamCard as="div" className="rounded-3xl p-6">
        <p className="text-xs uppercase tracking-wide text-(--muted-2)">Busca</p>
        <h2 className="mt-2 text-2xl font-semibold text-(--ink)">Resultados para &quot;{query}&quot;</h2>
        <p className="mt-2 text-sm text-(--muted)">{results.length} resultado(s) encontrado(s) nos posts mais recentes.</p>
      </BrandBeamCard>

      {results.length === 0 ? (
        <BrandBeamCard as="div" className="rounded-2xl p-5 text-sm text-(--muted)">
          Nenhum resultado por enquanto. Tente outros termos relacionados ao tema.
        </BrandBeamCard>
      ) : (
        <div className="system-post-card-grid">
          {results.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </section>
  );
}
