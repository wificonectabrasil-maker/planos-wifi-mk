import { notFound } from "next/navigation";
import { resolveSiteUrl } from "@/lib/site/url";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetSiloBySlug, adminListPostsBySiloId } from "@/lib/db";
import {
  deleteSiloAction,
  updateSiloAction,
} from "@/app/admin/silos/actions";
import { buildSiloMetrics } from "@/lib/seo/buildSiloMetrics";
import { buildInternalSimilarity } from "@/lib/seo/cannibalization";
import { SiloIntelligenceTabs } from "@/components/silos/SiloIntelligenceTabs";
import type { LinkAudit, LinkOccurrence, LinkOccurrenceEdge } from "@/lib/silo/types";

export const revalidate = 0;

export default async function EditSiloPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminSession();
  const { slug } = await params;
  const { error } = await searchParams;

  let silo: Awaited<ReturnType<typeof adminGetSiloBySlug>> = null;
  try {
    silo = await adminGetSiloBySlug(slug);
  } catch (loadError) {
    console.error("[SILO-PANEL] failed to load silo", loadError);
    silo = null;
  }
  if (!silo) return notFound();

  const serpQuery = [silo.name, silo.meta_title].filter(Boolean).join(" ").trim();

  let posts: Awaited<ReturnType<typeof adminListPostsBySiloId>> = [];
  try {
    posts = await adminListPostsBySiloId(silo.id);
  } catch (loadError) {
    console.error("[SILO-PANEL] failed to load silo posts", loadError);
    posts = [];
  }


  const { getAdminDatabase } = await import("@/lib/database");
  const siteUrl = resolveSiteUrl();

  let metrics: ReturnType<typeof buildSiloMetrics>;
  let cannibalization: ReturnType<typeof buildInternalSimilarity>;
  try {
    metrics = buildSiloMetrics({ silo, posts, siteUrl });
    cannibalization = buildInternalSimilarity(posts);
  } catch (metricsError) {
    console.error("[SILO-PANEL] failed to build metrics/cannibalization", metricsError);
    metrics = buildSiloMetrics({ silo, posts: [], siteUrl });
    cannibalization = [];
  }

  const database = getAdminDatabase();
  const postIds = posts.map((post) => post.id);

  const { data: siloPosts } = await database
    .from("silo_posts")
    .select("post_id, role, position")
    .eq("silo_id", silo.id);

  let occurrences: any[] = [];
  if (postIds.length > 0) {
    const { data, error: occurrenceError } = await database
      .from("post_link_occurrences")
      .select("*")
      .eq("silo_id", silo.id)
      .in("source_post_id", postIds);

    if (occurrenceError) {
      console.error("[SILO-PANEL] failed to load occurrences", occurrenceError);
    } else {
      occurrences = data ?? [];
    }
  }

  const { data: linkAudits } = await database.from("link_audits").select("*").eq("silo_id", silo.id);

  const normalizeLinkType = (raw: any): LinkOccurrence["link_type"] => {
    if (!raw) return null;
    const upper = String(raw).toUpperCase();
    if (upper === "INTERNAL" || upper === "EXTERNAL" || upper === "AFFILIATE") return upper as LinkOccurrence["link_type"];
    if (upper === "AMAZON") return "AFFILIATE";
    return null;
  };

  const normalizeOccurrence = (occ: any, fallbackId: string): LinkOccurrence => {
    const occurrenceId = String(occ.id ?? occ.occurrence_id ?? fallbackId);
    return {
      id: occurrenceId,
      silo_id: occ.silo_id ?? silo.id,
      source_post_id: String(occ.source_post_id ?? ""),
      target_post_id: occ.target_post_id ? String(occ.target_post_id) : null,
      anchor_text: occ.anchor_text ?? "[Sem texto]",
      context_snippet: occ.context_snippet ?? null,
      start_index: occ.start_index ?? null,
      end_index: occ.end_index ?? null,
      occurrence_key: occ.occurrence_key ?? null,
      href_normalized: occ.href_normalized ?? occ.target_url ?? "",
      position_bucket: occ.position_bucket ?? null,
      link_type: normalizeLinkType(occ.link_type),
      is_nofollow: occ.is_nofollow ?? (Array.isArray(occ.rel_flags) ? occ.rel_flags.includes("nofollow") : false),
      is_sponsored: occ.is_sponsored ?? (Array.isArray(occ.rel_flags) ? occ.rel_flags.includes("sponsored") : false),
      is_ugc: occ.is_ugc ?? (Array.isArray(occ.rel_flags) ? occ.rel_flags.includes("ugc") : false),
      is_blank: occ.is_blank ?? false,
    };
  };

  const normalizedOccurrences: LinkOccurrence[] = occurrences.map((occ, index) => normalizeOccurrence(occ, `occ-${index}`));

  const auditsByOccurrenceId = (linkAudits || []).reduce<Record<string, LinkAudit>>((acc, audit: any) => {
    const key = String(audit.occurrence_id ?? audit.occurrenceId ?? audit.id ?? "");
    if (!key) return acc;
    acc[key] = {
      ...audit,
      occurrence_id: String(audit.occurrence_id ?? audit.occurrenceId ?? key),
    };
    return acc;
  }, {});

  const linkEdgesMap = new Map<string, LinkOccurrenceEdge>();
  normalizedOccurrences.forEach((occ) => {
    if (!occ.target_post_id) return;
    if (String(occ.link_type ?? "INTERNAL") !== "INTERNAL") return;
    const key = `${occ.source_post_id}::${occ.target_post_id}`;
    const existing = linkEdgesMap.get(key);
    if (!existing) {
      linkEdgesMap.set(key, {
        id: `edge-${occ.source_post_id}-${occ.target_post_id}`,
        source_post_id: occ.source_post_id,
        target_post_id: occ.target_post_id,
        occurrence_ids: [String(occ.id ?? "")],
      });
      return;
    }
    existing.occurrence_ids.push(String(occ.id ?? ""));
  });
  const linkEdges = Array.from(linkEdgesMap.values());

  const { data: siloAuditList } = await database
    .from("silo_audits")
    .select("*")
    .eq("silo_id", silo.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const siloAudit = siloAuditList?.[0] || null;

  metrics.adjacency = [];
  metrics.perPostMetrics.forEach((metric) => {
    metric.inboundWithinSilo = 0;
    metric.outboundWithinSilo = 0;
  });

  normalizedOccurrences.forEach((occ) => {
    if (!occ.target_post_id) return;
    if (String(occ.link_type ?? "INTERNAL") !== "INTERNAL") return;

    const targetMetric = metrics.perPostMetrics.find((m) => m.postId === occ.target_post_id);
    if (targetMetric) targetMetric.inboundWithinSilo += 1;

    const sourceMetric = metrics.perPostMetrics.find((m) => m.postId === occ.source_post_id);
    if (sourceMetric) sourceMetric.outboundWithinSilo += 1;

    metrics.adjacency.push({
      sourceId: occ.source_post_id,
      targetId: occ.target_post_id,
      count: 1,
    });
  });

  const postsSummary = posts.map((post) => {
    const hierarchy = siloPosts?.find((sp: any) => sp.post_id === post.id);
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status ?? (post.published ? "published" : "draft"),
      focus_keyword: post.focus_keyword ?? null,
      targetKeyword: post.target_keyword ?? null,
      isPillar: post.pillar_rank === 1 || hierarchy?.role === "PILLAR",
      role: hierarchy?.role ?? null,
      position: hierarchy?.position ?? null,
    };
  });



  const errorMessage =
    error === "has_posts"
      ? "Não foi possível excluir: ainda existem posts vinculados a este silo."
      : error === "has_batches"
        ? "Não foi possível excluir: ainda existem batches vinculados a este silo."
        : error === "confirm_required"
          ? "Marque a confirmação para excluir o silo."
          : error === "delete_failed"
            ? "Falha ao excluir silo. Tente novamente."
            : error === "silo_groups_table_missing"
              ? "Tabela de grupos editoriais não encontrada. Aplique a migration turso/migrations."
              : error === "group_label_required"
                ? "Informe um nome para criar o novo grupo."
                : error === "group_key_invalid"
                  ? "Não foi possível gerar uma chave válida para este grupo."
                  : error === "group_create_failed"
                    ? "Falha ao criar grupo. Tente novamente."
                    : error === "group_save_failed"
                      ? "Falha ao salvar grupos do silo."
            : null;

  const settingsContent = (
    <div className="space-y-3">
      <form action={updateSiloAction} className="admin-subpane space-y-3 p-3">
        <input type="hidden" name="id" value={silo.id} />
        <input type="hidden" name="return_to" value={`/admin/silos/${silo.slug}`} />

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome">
            <input
              name="name"
              defaultValue={silo.name}
              required
              className="admin-input"
            />
          </Field>
          <Field label="Slug">
            <input
              name="slug"
              defaultValue={silo.slug}
              readOnly
              className="admin-input"
            />
          </Field>
        </div>

        <details className="rounded-md border border-(--border) bg-(--surface) px-2.5 py-2">
          <summary className="cursor-pointer list-none text-[11px] font-bold uppercase text-(--brand-hot)">
            Campos raros: descricao, SEO, hero e pilar
          </summary>
          <div className="mt-2 grid gap-2">

        <Field label="Descrição">
          <textarea
            name="description"
            defaultValue={silo.description ?? ""}
            rows={1}
            className="admin-textarea"
          />
        </Field>

        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Meta title">
            <input
              name="meta_title"
              defaultValue={silo.meta_title ?? ""}
              className="admin-input"
            />
          </Field>
          <Field label="Meta description">
            <input
              name="meta_description"
              defaultValue={silo.meta_description ?? ""}
              className="admin-input"
            />
          </Field>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Hero image URL">
            <input
              name="hero_image_url"
              defaultValue={silo.hero_image_url ?? ""}
              className="admin-input"
            />
          </Field>
          <Field label="Hero alt">
            <input
              name="hero_image_alt"
              defaultValue={silo.hero_image_alt ?? ""}
              className="admin-input"
            />
          </Field>
        </div>

        <Field label="Conteúdo do pilar (HTML ou markdown simples)">
          <textarea
            name="pillar_content_html"
            defaultValue={silo.pillar_content_html ?? ""}
            rows={3}
            className="admin-textarea"
            placeholder="Conteúdo opcional do pilar"
          />
        </Field>
          </div>
        </details>

        <div className="grid gap-2 md:grid-cols-[120px_150px_190px_1fr]">
          <Field label="Menu order">
            <input
              name="menu_order"
              type="number"
              defaultValue={silo.menu_order ?? 0}
              className="admin-input"
            />
          </Field>
          <Field label="Ativo">
            <div className="flex items-center gap-2 text-sm text-(--muted)">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                defaultChecked={silo.is_active ?? true}
                className="h-4 w-4 rounded border-(--border-strong)"
              />
              <label htmlFor="is_active">Hub publico ativo</label>
            </div>
          </Field>
          <Field label="Menu publico">
            <div className="flex items-center gap-2 text-sm text-(--muted)">
              <input
                id="show_in_navigation"
                name="show_in_navigation"
                type="checkbox"
                defaultChecked={silo.show_in_navigation ?? true}
                className="h-4 w-4 rounded border-(--border-strong)"
              />
              <label htmlFor="show_in_navigation">Exibir no menu principal</label>
            </div>
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--border) pt-2">
          <label className="inline-flex items-center gap-2 text-xs text-(--muted)">
            <input
              name="confirm_delete"
              type="checkbox"
              value="1"
              className="h-4 w-4 rounded border-(--border-strong)"
            />
            Confirmo exclusão permanente deste silo
          </label>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              formAction={deleteSiloAction}
              className="admin-button-danger"
            >
              Excluir silo
            </button>
            <button
              type="submit"
              className="admin-button-primary"
            >
              Salvar silo
            </button>
          </div>
        </div>
      </form>


    </div>
  );

  return (
    <div className="space-y-3">
      {errorMessage ? (
        <div className="admin-pane px-4 py-3 text-sm text-(--admin-danger)">{errorMessage}</div>
      ) : null}

      <SiloIntelligenceTabs
        silo={{ id: silo.id, name: silo.name, slug: silo.slug }}
        posts={postsSummary}
        metrics={metrics}
        linkOccurrences={normalizedOccurrences}
        linkEdges={linkEdges}
        auditsByOccurrenceId={auditsByOccurrenceId}
        linkAudits={(linkAudits || []) as React.ComponentProps<typeof SiloIntelligenceTabs>["linkAudits"]}
        siloAudit={siloAudit as React.ComponentProps<typeof SiloIntelligenceTabs>["siloAudit"]}
        cannibalization={cannibalization}
        serpDefaultQuery={serpQuery || silo.name}
        settingsContent={settingsContent}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[11px] font-semibold uppercase text-(--muted-2)">{label}</span>
      {children}
    </label>
  );
}
