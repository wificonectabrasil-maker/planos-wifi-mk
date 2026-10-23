import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetPostById } from "@/lib/db";
import { resolveContentHtmlForRender } from "@/lib/editor/resolveContentHtml";
import { buildPostCanonicalPath } from "@/lib/seo/canonical";
import { getCanonicalSiloSlug } from "@/lib/silo-config";
import { isUuid } from "@/lib/uuid";
import { PostArticle } from "@/components/site/PostArticle";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { robots: { index: false, follow: false } };

function statusLabel(post: NonNullable<Awaited<ReturnType<typeof adminGetPostById>>>) {
  const status = post.status ?? (post.published ? "published" : "draft");
  if (status === "published") return "Publicado";
  if (status === "review") return "Revisão";
  if (status === "scheduled") return "Agendado";
  return "Rascunho";
}

export default async function AdminPreviewPage({ params }: { params: Promise<{ postId: string }> }) {
  await requireAdminSession();
  const { postId } = await params;
  if (!isUuid(postId)) return notFound();
  const post = await adminGetPostById(postId);
  if (!post) return notFound();

  const siloSlug = post.silo?.slug ? getCanonicalSiloSlug(post.silo.slug) : "";
  const publicPath = buildPostCanonicalPath(siloSlug || null, post.slug);

  return (
    <>
      <aside className="system-preview-banner" aria-label="Prévia interna do artigo">
        <div className="wifi-container system-preview-banner-content">
          <div><p>Preview interno (admin)</p><p>Status: <strong>{statusLabel(post)}</strong></p></div>
          <div className="system-preview-actions">
            <Link href={`/admin/editor/${post.id}`}>Voltar ao editor</Link>
            {publicPath ? <a href={publicPath} target="_blank" rel="noopener noreferrer">Abrir URL pública</a> : null}
          </div>
        </div>
      </aside>
      <PostArticle post={post} contentHtml={resolveContentHtmlForRender(post)} siloSlug={siloSlug} editorHref={`/admin/editor/${post.id}`} />
    </>
  );
}
