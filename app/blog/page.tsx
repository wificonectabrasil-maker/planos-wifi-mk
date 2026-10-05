import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { getPublicDatabase } from "@/lib/database";
import { listLatestPublicPosts, getPublicSilos } from "@/lib/db";
import { Breadcrumb, FinalCTA, GuideCards } from "@/components/telecom/Shared";
import { telecomMetadata } from "@/lib/telecom/metadata";
import type { PublicHomePost } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = telecomMetadata(
  "Dicas e guias para escolher sua internet",
  "Informação para escolher internet, entender velocidades, Wi-Fi, combos e contratação. Explore os guias da WifiConecta.",
  "/blog",
);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = String((await searchParams).q || "")
    .trim()
    .slice(0, 200);
  const [latest, silos] = await Promise.all([
    listLatestPublicPosts(60),
    getPublicSilos(),
  ]);
  let posts: PublicHomePost[] = latest;
  if (q) {
    const result = await getPublicDatabase()
      .from("posts")
      .select(
        "id,title,slug,target_keyword,meta_description,hero_image_url,hero_image_alt,cover_image,og_image_url,updated_at,silo:silo_id(slug,name)",
      )
      .search(["title", "slug", "target_keyword"], q)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (result.error) throw new Error(result.error.message);
    posts = (result.data || []) as PublicHomePost[];
  }
  const topics = silos.filter((s) =>
    latest.some((p) => p.silo?.slug === s.slug),
  );
  return (
    <>
      <div className="wifi-page-tint">
        <div className="wifi-container">
          <Breadcrumb items={[{ label: "Dicas e guias", href: "/blog" }]} />
          <div className="wifi-page-intro">
            <p className="wifi-eyebrow">Informação pra escolher melhor</p>
            <h1>Internet sem o papo complicado.</h1>
            <p>
              Velocidade, Wi-Fi, combos e contratação. Entenda o que vale olhar
              antes de escolher sua próxima conexão.
            </p>
            <form action="/blog" className="wifi-blog-search">
              <label htmlFor="blog-search" className="sr-only">
                Buscar no blog
              </label>
              <input
                id="blog-search"
                name="q"
                placeholder="Busque por velocidade, Wi-Fi, operadora..."
                defaultValue={q}
                maxLength={200}
              />
              <button className="wifi-button" type="submit">
                <Search size={17} />
                Buscar
              </button>
            </form>
          </div>
        </div>
      </div>
      <section className="wifi-section wifi-container">
        {topics.length ? (
          <nav className="wifi-blog-topics" aria-label="Temas do blog">
            {topics.map((s) => (
              <Link key={s.id} href={`/${s.slug}`}>
                {s.name}
              </Link>
            ))}
          </nav>
        ) : null}
        {posts.length ? (
          <>
            <div className="wifi-section-heading">
              <h2>{q ? `Resultados para “${q}”` : "Publicações recentes"}</h2>
            </div>
            <div className="wifi-guide-grid">
              {posts.map((p) => (
                <article key={p.id} className="wifi-guide-card">
                  <p className="wifi-eyebrow">
                    {p.silo?.name || "Internet e rotina"}
                  </p>
                  <h3>
                    <Link href={`/${p.silo?.slug}/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <p>
                    {p.meta_description ||
                      "Veja os pontos que ajudam a escolher e consultar seu plano."}
                  </p>
                  <Link
                    className="wifi-text-link"
                    href={`/${p.silo?.slug}/${p.slug}`}
                  >
                    Ler o guia <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="wifi-section-heading">
              <div>
                <h2>
                  {q
                    ? "Nenhum artigo encontrado."
                    : "Comece pelos guias de escolha."}
                </h2>
                <p>
                  {q
                    ? "Tente outro termo ou explore os caminhos abaixo."
                    : "Os artigos do blog ainda estão em preparação. Enquanto isso, estes caminhos já ajudam na sua comparação."}
                </p>
              </div>
            </div>
            <GuideCards />
          </>
        )}
      </section>
      <FinalCTA />
    </>
  );
}
