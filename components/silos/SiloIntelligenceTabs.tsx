"use client";

import { useMemo, useState } from "react";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";
import type { CannibalizationPair } from "@/lib/seo/cannibalization";
import { SiloLinkGraph } from "@/components/silos/SiloLinkGraph";
import { SiloPostsTable } from "@/components/silos/SiloPostsTable";
import { SiloCannibalizationPanel } from "@/components/silos/SiloCannibalizationPanel";
import { SiloSerpPanel } from "@/components/silos/SiloSerpPanel";
import type { LinkOccurrence, LinkAudit, LinkOccurrenceEdge, SiloAudit } from "@/lib/silo/types";

export type SiloPostSummary = {
  id: string;
  title: string;
  slug: string;
  status?: string | null;
  focus_keyword?: string | null;
  targetKeyword?: string | null;
  isPillar?: boolean;
  role?: "PILLAR" | "SUPPORT" | "AUX" | null;
  position?: number | null;
};

type Tab = "settings" | "overview" | "graph" | "cannibalization" | "serp";

type SiloIntelligenceTabsProps = {
  silo: { id: string; name: string; slug: string };
  posts: SiloPostSummary[];
  metrics: SiloMetrics;
  cannibalization: CannibalizationPair[];
  serpDefaultQuery: string;
  linkOccurrences?: LinkOccurrence[];
  linkEdges?: LinkOccurrenceEdge[];
  auditsByOccurrenceId?: Record<string, LinkAudit>;
  linkAudits?: LinkAudit[];
  siloAudit?: SiloAudit | null;
  settingsContent?: React.ReactNode;
};

export function SiloIntelligenceTabs({
  silo,
  posts,
  metrics,
  cannibalization,
  serpDefaultQuery,
  linkOccurrences,
  linkEdges,
  auditsByOccurrenceId,
  linkAudits,
  siloAudit,
  settingsContent
}: SiloIntelligenceTabsProps) {
  const [tab, setTab] = useState<Tab>("settings");
  const [serpQuery, setSerpQuery] = useState(serpDefaultQuery);

  const postQueries = useMemo(() => {
    const map = new Map<string, string>();
    posts.forEach((post) => {
      const query = post.focus_keyword?.trim() || post.targetKeyword?.trim() || post.title.trim();
      if (query) map.set(post.id, query);
    });
    return map;
  }, [posts]);

  const handleViewSerp = (postId: string) => {
    const query = postQueries.get(postId);
    if (!query) return;
    setSerpQuery(query);
    setTab("serp");
  };

  const stats = [
    { label: "Links totais", value: metrics.totals.totalLinks },
    { label: "Internos", value: metrics.totals.internalLinks },
    { label: "Externos", value: metrics.totals.externalLinks },
    { label: "Amazon", value: metrics.totals.amazonLinks },
    { label: "Nofollow", value: metrics.relCounts.nofollow },
    { label: "Sponsored", value: metrics.relCounts.sponsored },
  ];

  return (
    <section className="admin-pane space-y-4 p-4 md:p-5">
      <div className="admin-tab-strip">
        <TabButton label="Metadados" active={tab === "settings"} onClick={() => setTab("settings")} />
        <TabButton label="Visão Geral" active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabButton label="Mapa de Links" active={tab === "graph"} onClick={() => setTab("graph")} />
        <TabButton label="Canibalização" active={tab === "cannibalization"} onClick={() => setTab("cannibalization")} />
        <TabButton label="SERP" active={tab === "serp"} onClick={() => setTab("serp")} />
      </div>

      {tab === "settings" ? (
        <div className="py-4">
          {settingsContent}
        </div>
      ) : null}

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-(--border) p-6 text-sm text-(--muted)">
          Nenhum post associado a este silo ainda.
        </div>
      ) : null}

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="admin-kpi">
                <div className="admin-kpi-label">{item.label}</div>
                <div className="admin-kpi-value mt-2 text-xl">{item.value}</div>
              </div>
            ))}
          </div>

          <SiloPostsTable
            siloSlug={silo.slug}
            posts={posts}
            metrics={metrics}
            onViewSerp={handleViewSerp}
          />
        </div>
      ) : null}

      {tab === "graph" ? (
        <SiloLinkGraph
          silo={silo}
          posts={posts}
          metrics={metrics}
          linkOccurrences={linkOccurrences}
          linkEdges={linkEdges}
          auditsByOccurrenceId={auditsByOccurrenceId}
          linkAudits={linkAudits}
          siloAudit={siloAudit}
        />
      ) : null}

      {tab === "cannibalization" ? (
        <SiloCannibalizationPanel
          silo={silo}
        />
      ) : null}

      {tab === "serp" ? (
        <div className="max-w-3xl">
          <SiloSerpPanel defaultQuery={serpQuery} baselineQuery={serpDefaultQuery} title="SERP do Silo" />
        </div>
      ) : null}
    </section>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-tab flex-1 ${active ? "is-active" : ""}`}
    >
      {label}
    </button>
  );
}
