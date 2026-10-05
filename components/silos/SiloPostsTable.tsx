"use client";

import Link from "next/link";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";
import type { SiloPostSummary } from "@/components/silos/SiloIntelligenceTabs";

type SiloPostsTableProps = {
  siloSlug: string;
  posts: SiloPostSummary[];
  metrics: SiloMetrics;
  onViewSerp?: (postId: string) => void;
};

function statusLabel(status?: string | null) {
  if (!status) return "draft";
  return status;
}

export function SiloPostsTable({ siloSlug, posts, metrics, onViewSerp }: SiloPostsTableProps) {
  const metricsByPost = new Map(metrics.perPostMetrics.map((metric) => [metric.postId, metric]));
  const sortedPosts = [...posts].sort((a, b) => {
    const aPosition = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
    const bPosition = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="admin-table-shell">
      <div className="admin-scrollbar overflow-x-auto">
        <table className="admin-table min-w-[1080px] text-left text-sm">
          <thead>
            <tr>
              <th>Post</th>
              <th>Hierarquia</th>
              <th>Status</th>
              <th>Keyword principal</th>
              <th>Links internos</th>
              <th>Links externos</th>
              <th>Amazon</th>
              <th>Nofollow / Sponsored</th>
              <th>Inbound silo</th>
              <th>Outbound silo</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {sortedPosts.map((post) => {
              const metric = metricsByPost.get(post.id);
              const role = post.role ?? (post.isPillar ? "PILLAR" : null);
              return (
                <tr key={post.id}>
                  <td className="font-medium text-(--text)">
                    <div className="min-w-[300px]">
                      <div className="font-sans text-[13px] font-semibold leading-snug text-(--text-strong)">{post.title}</div>
                      <div className="mt-1 break-all rounded border border-[rgba(64,209,219,0.18)] bg-(--surface-muted) px-2 py-1 font-mono text-[11px] leading-snug text-[#aeeff4]">
                        /{siloSlug}/{post.slug}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="leading-tight">
                      <div>{typeof post.position === "number" ? `#${post.position}` : "Sem posicao"}</div>
                      <div className="text-[10px] uppercase text-(--muted-2)">{role ?? "Sem papel"}</div>
                    </div>
                  </td>
                  <td>{statusLabel(post.status)}</td>
                  <td>{post.focus_keyword || post.targetKeyword?.trim() || post.title}</td>
                  <td>{metric?.internalSiloLinks ?? 0}</td>
                  <td>{metric?.externalLinks ?? 0}</td>
                  <td>{metric?.amazonLinks ?? 0}</td>
                  <td>
                    {(metric?.nofollow ?? 0)}/{metric?.sponsored ?? 0}
                  </td>
                  <td>{metric?.inboundWithinSilo ?? 0}</td>
                  <td>{metric?.outboundWithinSilo ?? 0}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/editor/${post.id}`} target="_blank" className="admin-button-soft">
                        Abrir no editor
                      </Link>
                      {onViewSerp ? (
                        <button type="button" onClick={() => onViewSerp(post.id)} className="admin-button-ghost">
                          Ver relatorio SERP
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
