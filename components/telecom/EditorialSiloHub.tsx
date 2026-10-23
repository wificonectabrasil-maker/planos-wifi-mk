import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { ArrowRight, ClipboardList, Router } from "lucide-react";
import { getPublicPostsBySilo } from "@/lib/db";
import { wifiEditorialSilos } from "@/lib/telecom/editorial-plan";
import { buildPostCanonicalPath } from "@/lib/seo/canonical";
import { staticPageMetadata } from "@/lib/telecom/metadata";
import { resolveSiteUrl } from "@/lib/site/url";
import { JsonLd } from "@/components/seo/JsonLd";
import { PostCard } from "@/components/site/PostCard";
import { Breadcrumb } from "./Shared";
import type { Post } from "@/lib/types";
import briefs from "@/lib/telecom/editorial-briefs";
import { publicIndexingAllowed } from "@/lib/site/indexing";

type SiloSlug = (typeof wifiEditorialSilos)[number]["slug"];
const getSiloPosts = cache((slug: SiloSlug) => getPublicPostsBySilo(slug));
function definition(slug: SiloSlug) {
  return wifiEditorialSilos.find(silo => silo.slug === slug)!;
}

export async function editorialHubMetadata(slug: SiloSlug): Promise<Metadata> {
  const silo = definition(slug);
  const posts = await getSiloPosts(slug);
  return {
    ...staticPageMetadata(silo.path),
    robots: { index: posts.length > 0 && publicIndexingAllowed(), follow: true },
  };
}

export async function EditorialSiloHub({ slug }: { slug: SiloSlug }) {
  const silo = definition(slug);
  const posts = [...(await getSiloPosts(slug))].sort((a, b) =>
    Number(b.silo_role === "PILLAR") - Number(a.silo_role === "PILLAR") || (a.silo_order || 0) - (b.silo_order || 0),
  );
  const pillars = posts.filter(post => post.silo_role === "PILLAR");
  const supports = posts.filter(post => post.silo_role !== "PILLAR");
  const Icon = silo.icon === "plans" ? ClipboardList : Router;
  const other = wifiEditorialSilos.find(item => item.slug !== slug)!;
  return (
    <>
      <div className="wifi-page-tint">
        <div className="wifi-container">
          <Breadcrumb items={[{ label: silo.name, href: silo.path }]} />
          <div className="wifi-page-intro wifi-editorial-intro">
            <span className="wifi-editorial-symbol"><Icon size={36} aria-hidden="true" /></span>
            <p className="wifi-eyebrow">Um tema, vários caminhos</p>
            <h1>{silo.title}</h1>
            <p>{silo.introduction}</p>
            <ul className="wifi-editorial-scope">{silo.scope.map(topic => <li key={topic}>{topic}</li>)}</ul>
          </div>
        </div>
      </div>
      <section className="wifi-section wifi-container">
        {posts.length ? (
          <>
            {pillars.length ? <section aria-labelledby="silo-pillar-heading">
              <div className="wifi-section-heading"><h2 id="silo-pillar-heading">Comece pelo guia principal</h2></div>
              <div className="wifi-guide-grid wifi-editorial-grid">
                {pillars.map(post => <SiloPostCard key={post.id} post={post} slug={slug} pillar />)}
              </div>
            </section> : null}
            {supports.length ? <section aria-labelledby="silo-support-heading" className={pillars.length ? "wifi-editorial-supports" : undefined}>
              <div className="wifi-section-heading"><h2 id="silo-support-heading">Aprofunde por assunto</h2></div>
              <div className="wifi-guide-grid wifi-editorial-grid">
                {supports.filter(post => !briefs.some(brief => brief.siloSlug === slug && brief.slug === post.slug)).map(post => <SiloPostCard key={post.id} post={post} slug={slug} />)}
              </div>
              {silo.groups.map(group => {
                const grouped = supports.filter(post => briefs.some(brief => brief.slug === post.slug && group.numbers.some(number => number === brief.number)));
                return grouped.length ? <div className="wifi-editorial-supports" key={group.title}><h3>{group.title}</h3><div className="wifi-guide-grid wifi-editorial-grid">{grouped.map(post => <SiloPostCard key={post.id} post={post} slug={slug} />)}</div></div> : null;
              })}
            </section> : null}
          </>
        ) : (
          <div className="wifi-editorial-empty">
            <h2>Os primeiros artigos estão em preparação.</h2>
            <p>As publicações deste tema aparecerão aqui assim que estiverem prontas.</p>
          </div>
        )}
        <nav className="wifi-editorial-next" aria-label="Continuar explorando os temas">
          <Link prefetch={false} href={other.path} className="wifi-text-link">Explorar {other.name} <ArrowRight size={16} aria-hidden="true" /></Link>
        </nav>
      </section>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: silo.name,
        url: `${resolveSiteUrl()}${silo.path}`,
        mainEntity: { "@type": "ItemList", itemListElement: posts.map((post, index) => ({
          "@type": "ListItem", position: index + 1, name: post.title, url: `${resolveSiteUrl()}${buildPostCanonicalPath(slug, post.slug)}`,
        })) },
      }} />
    </>
  );
}

function SiloPostCard({ post, slug, pillar = false }: { post: Post; slug: SiloSlug; pillar?: boolean }) {
  return <PostCard post={post} silo={{ slug, name: definition(slug).name }} pillar={pillar} />;
}
