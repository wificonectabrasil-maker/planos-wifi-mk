import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetSiloBySlug, adminListPostLinksBySilo, adminListPosts } from "@/lib/db";

export const revalidate = 0;

type LinkRow = {
  source: { id: string; slug: string };
  target?: { id: string; slug: string } | null;
  link_type: string;
  rel_flags?: string[] | null;
  target_url?: string | null;
};

export default async function SiloLinksPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminSession();
  const { slug } = await params;
  const silo = await adminGetSiloBySlug(slug);
  if (!silo) return notFound();

  const [posts, rawLinks] = await Promise.all([
    adminListPosts({ status: null }),
    adminListPostLinksBySilo(silo.id),
  ]);

  const siloPosts = posts.filter((p) => p.silo?.slug === slug);
  const linkRows = rawLinks as any as LinkRow[];

  const stats = siloPosts.map((post) => {
    const outbound = linkRows.filter((l) => l.source?.id === post.id);
    const inbound = linkRows.filter((l) => l.target?.id === post.id);
    const outboundInternal = outbound.filter((l) => l.link_type === "internal" || l.link_type === "mention" || l.link_type === "about");
    const outboundExternal = outbound.filter((l) => l.link_type === "external" || l.link_type === "affiliate");
    const affiliateIssues = outboundExternal.filter((l) => l.link_type === "affiliate" && !(l.rel_flags ?? []).includes("sponsored"));
    return {
      post,
      inbound: inbound.length,
      outboundInternal: outboundInternal.length,
      outboundExternal: outboundExternal.length,
      affiliateIssues: affiliateIssues.length,
    };
  });

  const orphans = stats.filter((s) => s.inbound === 0);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <p className="text-xs text-(--muted-2)">Guardian do Silo</p>
        <h1 className="mt-2 text-2xl font-semibold">Arquitetura do silo {silo.name}</h1>
        <p className="mt-2 text-sm text-(--muted)">Inbound/outbound e vazamentos.</p>
      </header>

      <div className="overflow-hidden rounded-3xl border border-(--border) bg-(--paper)">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--surface-muted) text-xs text-(--muted-2)">
            <tr>
              <th className="px-4 py-3">Post</th>
              <th className="px-4 py-3">Inbound</th>
              <th className="px-4 py-3">Outbound int</th>
              <th className="px-4 py-3">Outbound ext</th>
              <th className="px-4 py-3">Afiliado sem sponsored</th>
              <th className="px-4 py-3">Editar</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((item) => (
              <tr key={item.post.id} className="border-t border-(--border)">
                <td className="px-4 py-3 font-medium">{item.post.title}</td>
                <td className="px-4 py-3 text-(--muted)">{item.inbound}</td>
                <td className="px-4 py-3 text-(--muted)">{item.outboundInternal}</td>
                <td className="px-4 py-3 text-(--muted)">{item.outboundExternal}</td>
                <td className="px-4 py-3 text-(--muted)">{item.affiliateIssues}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/editor/${item.post.id}`}
                    className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-xs hover:bg-(--brand-primary)"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-(--border) bg-(--paper) p-6 space-y-3">
        <h2 className="text-sm font-semibold">Paginas orfas</h2>
        {orphans.length === 0 ? (
          <p className="text-xs text-(--muted)">Nenhuma página orfa.</p>
        ) : (
          <ul className="text-sm text-(--muted) space-y-1">
            {orphans.map((o) => (
              <li key={o.post.id}>
                <Link href={`/admin/editor/${o.post.id}`} className="text-(--brand-hot) underline">
                  {o.post.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
