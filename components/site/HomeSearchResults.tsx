"use client";
import { buildPostCanonicalPath } from "@/lib/seo/canonical";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { BorderBeam } from "@/components/ui/border-beam";
import { resolvePostCoverAlt, resolvePostCoverUrl } from "@/lib/site/postCover";
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
        <div className="stagger-grid grid gap-5 md:grid-cols-2">
          {results.map((post, index) => {
            const cover = resolvePostCoverUrl(post);
            const coverAlt = resolvePostCoverAlt(post);
            const href = post.silo ? buildPostCanonicalPath(post.silo.slug, post.slug)! : "/#posts-mais-novos";

            return (
              <Link
                key={post.id}
                href={href}
                className="brand-card group relative flex h-full flex-col overflow-hidden rounded-2xl transition hover:-translate-y-0.5 hover:brightness-95"
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b border-[rgba(165,119,100,0.2)] bg-[rgba(255,248,234,0.8)]">
                  {cover ? (
                    <img
                      src={cover}
                      alt={coverAlt}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-(--brand-accent)">
                      Sem imagem de capa
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
                  <p className="text-xs uppercase tracking-wide text-(--muted-2)">{post.silo?.name ?? "Conteudo"}</p>
                  <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-(--ink)">{post.title}</h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-(--muted)">
                    {post.meta_description || "Abrir artigo para ver detalhes e comparativos."}
                  </p>
                  <span className="mt-auto inline-flex w-fit items-center rounded-full bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-(--paper)">
                    Ver post
                  </span>
                </div>
                <BorderBeam
                  size={400}
                  duration={6}
                  delay={index % 4}
                  colorFrom="transparent"
                  colorTo="#136863"
                  borderWidth={1}
                  className="from-transparent to-transparent"
                />
                <BorderBeam
                  size={400}
                  duration={6}
                  delay={(index % 4) + 3}
                  colorFrom="transparent"
                  colorTo="#136863"
                  borderWidth={2}
                  className="from-transparent to-transparent"
                />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
