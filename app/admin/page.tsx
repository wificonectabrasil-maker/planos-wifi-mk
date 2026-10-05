import Link from "next/link";
import { adminListPosts, adminListSilos } from "@/lib/db";
import { bulkDeletePosts, schedulePost, setPublishState } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminDatabase } from "@/lib/database";
import { buildPostCanonicalPath } from "@/lib/seo/canonical";

export const revalidate = 0;

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  review: "Revisão",
  scheduled: "Agendado",
  published: "Publicado",
};

type HierarchyRole = "PILLAR" | "SUPPORT" | "AUX";
type HierarchyDisplay = {
  role: HierarchyRole;
  position: number | null;
  label: string;
};
type SortKey = "status" | "title" | "silo" | "hierarchy" | "updated";
type SortDir = "asc" | "desc";

const DEFAULT_SORT_KEY: SortKey = "updated";
const DEFAULT_SORT_DIR: SortDir = "desc";
const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  review: 1,
  scheduled: 2,
  published: 3,
};
const HIERARCHY_ORDER: Record<HierarchyRole, number> = {
  PILLAR: 0,
  SUPPORT: 1,
  AUX: 2,
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

function statusTone(status: string) {
  if (status === "published") return "admin-badge admin-badge-positive";
  if (status === "scheduled") return "admin-badge admin-badge-warning";
  if (status === "review") return "admin-badge admin-badge-warning";
  return "admin-badge admin-badge-neutral";
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "pt-BR", { sensitivity: "base" });
}

function compareNumber(left: number, right: number) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareDate(left?: string | null, right?: string | null) {
  const leftValue = left ? new Date(left).getTime() : 0;
  const rightValue = right ? new Date(right).getTime() : 0;
  return compareNumber(leftValue, rightValue);
}

function parseSortKey(value: unknown): SortKey {
  if (value === "status" || value === "title" || value === "silo" || value === "hierarchy" || value === "updated") {
    return value;
  }
  return DEFAULT_SORT_KEY;
}

function parseSortDir(value: unknown): SortDir {
  return value === "asc" || value === "desc" ? value : DEFAULT_SORT_DIR;
}

function getDefaultDirection(sortKey: SortKey): SortDir {
  return sortKey === "updated" ? "desc" : "asc";
}

function normalizeHierarchyRole(value: unknown): HierarchyRole | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  if (upper === "PILLAR" || upper === "SUPPORT" || upper === "AUX") {
    return upper;
  }
  return null;
}

function normalizeHierarchyPosition(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
}

function buildHierarchyDisplayMap(
  posts: Array<{
    id: string;
    silo_id: string | null;
    pillar_rank?: number | null;
    silo_role?: HierarchyRole | null;
  }>,
  hierarchyRows: Array<{ post_id: string; silo_id: string; role: HierarchyRole | null; position: number | null }>
) {
  const displayMap = new Map<string, HierarchyDisplay>();
  const hierarchyByPostAndSilo = new Map<string, { role: HierarchyRole | null; position: number | null }>();
  const hierarchyByPost = new Map<string, { role: HierarchyRole | null; position: number | null }>();

  hierarchyRows.forEach((row) => {
    hierarchyByPostAndSilo.set(`${row.post_id}:${row.silo_id}`, { role: row.role, position: row.position });
    hierarchyByPost.set(row.post_id, { role: row.role, position: row.position });
  });

  posts.forEach((post) => {
    const hierarchy =
      (post.silo_id ? hierarchyByPostAndSilo.get(`${post.id}:${post.silo_id}`) : null) ??
      hierarchyByPost.get(post.id);
    if (!post.silo_id && !hierarchy) {
      return;
    }

    const role =
      normalizeHierarchyRole(hierarchy?.role) ??
      normalizeHierarchyRole(post.silo_role) ??
      (post.pillar_rank === 1 ? "PILLAR" : "SUPPORT");
    const position = role === "PILLAR" ? 1 : normalizeHierarchyPosition(hierarchy?.position);
    const label =
      role === "PILLAR"
        ? "Pilar"
        : role === "AUX"
          ? typeof position === "number"
            ? `Apoio ${position}`
            : "Apoio"
          : typeof position === "number"
            ? `Suporte ${position}`
            : "Suporte";

    displayMap.set(post.id, { role, position, label });
  });

  return displayMap;
}

function sortPostsForAdmin<
  T extends {
    id: string;
    title: string;
    slug: string;
    status?: string | null;
    published?: boolean | null;
    silo?: { name?: string | null } | null;
    updated_at?: string | null;
  },
>(posts: T[], hierarchyMap: Map<string, HierarchyDisplay>, sortKey: SortKey, sortDir: SortDir) {
  return [...posts].sort((left, right) => {
    const leftStatus = left.status ?? (left.published ? "published" : "draft");
    const rightStatus = right.status ?? (right.published ? "published" : "draft");
    const leftHierarchy = hierarchyMap.get(left.id) ?? null;
    const rightHierarchy = hierarchyMap.get(right.id) ?? null;

    let result = 0;

    if (sortKey === "status") {
      result =
        compareNumber(STATUS_ORDER[leftStatus] ?? Number.MAX_SAFE_INTEGER, STATUS_ORDER[rightStatus] ?? Number.MAX_SAFE_INTEGER) ||
        compareText(left.title, right.title);
    } else if (sortKey === "title") {
      result = compareText(left.title, right.title) || compareText(left.slug, right.slug);
    } else if (sortKey === "silo") {
      result =
        compareText(left.silo?.name ?? "", right.silo?.name ?? "") ||
        compareText(left.title, right.title);
    } else if (sortKey === "hierarchy") {
      result =
        compareNumber(
          leftHierarchy ? HIERARCHY_ORDER[leftHierarchy.role] : Number.MAX_SAFE_INTEGER,
          rightHierarchy ? HIERARCHY_ORDER[rightHierarchy.role] : Number.MAX_SAFE_INTEGER
        ) ||
        compareNumber(leftHierarchy?.position ?? Number.MAX_SAFE_INTEGER, rightHierarchy?.position ?? Number.MAX_SAFE_INTEGER) ||
        compareText(left.title, right.title);
    } else {
      result = compareDate(left.updated_at, right.updated_at) || compareText(left.title, right.title);
    }

    return sortDir === "asc" ? result : result * -1;
  });
}

function buildSortHref({
  sortKey,
  activeSort,
  activeDir,
  status,
  q,
}: {
  sortKey: SortKey;
  activeSort: SortKey;
  activeDir: SortDir;
  status?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  const nextDir = activeSort === sortKey ? (activeDir === "asc" ? "desc" : "asc") : getDefaultDirection(sortKey);

  if (status && status !== "all") params.set("status", status);
  if (q?.trim()) params.set("q", q.trim());
  params.set("sort", sortKey);
  params.set("dir", nextDir);

  return `/admin?${params.toString()}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string; dir?: string; deleted?: string; redirected?: string; delete_error?: string; delete_detail?: string }>;
}) {
  await requireAdminSession();
  const { status, q, sort, dir, deleted, redirected, delete_error, delete_detail } = await searchParams;
  const statusFilter = status && status !== "all" ? status : null;
  const activeSort = parseSortKey(sort);
  const activeDir = parseSortDir(dir);

  let posts: any[] = [];
  let silos: any[] = [];

  try {
    const [p, s] = await Promise.all([
      adminListPosts({ status: statusFilter, query: q ?? null }),
      adminListSilos(),
    ]);
    posts = p;
    silos = s;
  } catch (error: any) {
    console.error("[ADMIN] Failed to load dashboard data", error);
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-2xl border border-(--border-strong) bg-(--bg-offset) p-10 text-center">
        <div className="h-12 w-12 rounded-full bg-red-500/10 p-3 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-(--text)">Erro de Conexão com o Banco</h2>
        <p className="max-w-md text-sm text-(--muted)">
          Não foi possível carregar os dados do painel editorial. Verifique se o seu projeto Turso está ativo e se as chaves no <code className="text-red-400">.env.local</code> estão corretas.
        </p>
        <div className="bg-black/20 p-3 rounded-lg text-[11px] font-mono text-red-300 max-w-full overflow-auto">
          {error?.message || String(error)}
        </div>
        <Link href="/admin" className="admin-button-primary mt-4">
          Tentar novamente
        </Link>
      </div>
    );
  }

  const database = getAdminDatabase();
  const postIds = posts.map((post) => post.id);
  let hierarchyRows: Array<{ post_id: string; silo_id: string; role: HierarchyRole | null; position: number | null }> = [];

  if (postIds.length > 0) {
    const { data, error } = await database
      .from("silo_posts")
      .select("post_id, silo_id, role, position")
      .in("post_id", postIds);

    if (!error) {
      hierarchyRows = (data ?? []) as typeof hierarchyRows;
    } else if (error.code !== "TABLE_NOT_FOUND") {
      console.error("Erro ao carregar hierarquia da lista de conteúdos", {
        code: error.code,
        message: error.message,
      });
    }
  }

  const hierarchyMap = buildHierarchyDisplayMap(posts, hierarchyRows);
  const sortedPosts = sortPostsForAdmin(posts, hierarchyMap, activeSort, activeDir);

  const totals = {
    total: posts.length,
    draft: posts.filter((post) => (post.status ?? (post.published ? "published" : "draft")) === "draft").length,
    review: posts.filter((post) => (post.status ?? (post.published ? "published" : "draft")) === "review").length,
    published: posts.filter((post) => (post.status ?? (post.published ? "published" : "draft")) === "published").length,
  };

  const countBySiloId = new Map<string, number>();
  posts.forEach((post) => {
    if (!post.silo_id) return;
    countBySiloId.set(post.silo_id, (countBySiloId.get(post.silo_id) ?? 0) + 1);
  });

  const siloDistribution = silos.map((silo) => ({
    id: silo.id,
    name: silo.name,
    count: countBySiloId.get(silo.id) ?? 0,
  }));

  return (
    <div className="space-y-3 pb-2">
      <section className="admin-pane p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-[240px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-(--muted-2)">Painel editorial</p>
            <h2 className="mt-1 text-xl font-semibold text-(--text)">Conteúdo em operação</h2>
            <p className="hidden">
              Priorize o que precisa de contraste: status, hierarquia, SEO e próxima ação.
            </p>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <InlineStat label="Total" value={totals.total} />
            <InlineStat label="Rascunhos" value={totals.draft} />
            <InlineStat label="RevisÃ£o" value={totals.review} />
            <InlineStat label="Publicados" value={totals.published} />
          </div>

          <Link href="/admin/editor/new" className="admin-button-primary min-h-[34px] px-3 py-1.5 text-[11px]">
            Criar novo post
          </Link>
        </div>

        <div className="hidden">
          <StatCard label="Total" value={totals.total} helper="Posts no filtro atual" />
          <StatCard label="Rascunhos" value={totals.draft} helper="Aguardando estrutura" />
          <StatCard label="Em revisão" value={totals.review} helper="Checar SEO e fontes" />
          <StatCard label="Publicados" value={totals.published} helper="Prontos no site" />
        </div>

        <details className="mt-2 rounded-md border border-(--border-strong) bg-[rgba(255,255,255,0.02)] px-2.5 py-1.5">
          <summary className="cursor-pointer list-none text-[11px] font-bold uppercase text-(--muted)">
            DistribuiÃ§Ã£o por silo: {siloDistribution.filter((item) => item.count === 2).length}/{siloDistribution.length} no alvo
          </summary>
        <div className="hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--muted-2)">Distribuição por silo</p>
              <p className="mt-1 text-xs text-(--muted)">Meta visual: 2 posts por silo; ajuste na tabela abaixo sem sair da listagem.</p>
            </div>
            <div className="text-[11px] text-(--muted)">
              {siloDistribution.filter((item) => item.count === 2).length}/{siloDistribution.length} silos no alvo
            </div>
          </div>

          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {siloDistribution.map((item) => (
              <DistributionChip key={item.id} label={item.name} count={item.count} />
            ))}
          </div>
        </details>
      </section>

      <form method="get" className="admin-subpane flex flex-wrap items-end gap-2 p-3">
        <input type="hidden" name="sort" value={activeSort} />
        <input type="hidden" name="dir" value={activeDir} />

        <div className="flex min-w-[150px] flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--muted-2)">Status</label>
          <select name="status" defaultValue={status ?? "all"} className="admin-select">
            <option value="all">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="review">Revisão</option>
            <option value="scheduled">Agendado</option>
            <option value="published">Publicado</option>
          </select>
        </div>

        <div className="flex min-w-[260px] flex-1 flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--muted-2)">Busca</label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por título ou slug"
            className="admin-input"
          />
        </div>

        <button type="submit" className="admin-button-soft">
          Filtrar
        </button>
      </form>

      <section className="admin-table-shell">
        {deleted ? (
          <div className="border-b border-(--border-strong) bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
            {deleted} artigo{deleted === "1" ? "" : "s"} removido{deleted === "1" ? "" : "s"}.
            {redirected ? ` ${redirected} URL${redirected === "1" ? "" : "s"} publica${redirected === "1" ? "" : "s"} recebeu redirecionamento 308.` : ""}
          </div>
        ) : null}
        {delete_error ? (
          <div className="border-b border-(--border-strong) bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
            {delete_error === "none_selected"
              ? "Selecione pelo menos um artigo ou confirme pelo slug do artigo."
              : delete_error === "confirm_slugs"
                ? "Cole o slug do artigo selecionado. Para varios artigos, cole todos os slugs selecionados."
                : delete_error === "slug_mismatch"
                  ? "Os slugs confirmados nao batem exatamente com os artigos selecionados. Cole apenas o slug que aparece em azul na coluna Titulo, sem usar o titulo do artigo."
              : delete_error === "guardrails"
                  ? "A migracao de protecao de URLs ainda nao foi aplicada no banco."
                  : "Nao foi possivel apagar os artigos selecionados."}
            {delete_detail ? (
              <span className="mt-1 block break-all font-mono text-[11px] font-normal text-red-100/80">
                Detalhe: {delete_detail}
              </span>
            ) : null}
          </div>
        ) : null}
        <form
          id="deleteForm"
          action={bulkDeletePosts as any}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border-strong) bg-[rgba(20,20,28,0.72)] px-3 py-2 text-xs text-(--muted)"
        >
          <span>Selecione os artigos e confirme colando exatamente os slugs em azul da coluna Titulo. Se algum era publico, o redirecionamento 308 sera criado automaticamente.</span>
          <details open className="min-w-[280px] flex-1 rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1">
            <summary className="cursor-pointer list-none text-[11px] font-bold uppercase text-red-300">
              Confirmar slugs selecionados
            </summary>
            <div className="mt-2 grid gap-2">
              <textarea
                name="confirm_intent"
                placeholder="Cole aqui o slug ou os slugs selecionados, um por linha"
                className="admin-input min-h-[42px] resize-y text-[11px]"
              />
            </div>
          </details>
          <button type="submit" className="admin-button-danger">
            Apagar selecionados
          </button>
        </form>

        <div className="admin-scrollbar overflow-x-auto">
          <table className="admin-table min-w-[920px]">
            <thead>
              <tr>
                <th>Sel</th>
                <SortableHeader label="Status" sortKey="status" activeSort={activeSort} activeDir={activeDir} status={status} q={q} />
                <th>Capa</th>
                <SortableHeader label="Título" sortKey="title" activeSort={activeSort} activeDir={activeDir} status={status} q={q} />
                <SortableHeader label="Silo" sortKey="silo" activeSort={activeSort} activeDir={activeDir} status={status} q={q} />
                <SortableHeader label="Hierarquia" sortKey="hierarchy" activeSort={activeSort} activeDir={activeDir} status={status} q={q} />
                <SortableHeader label="Atualizado" sortKey="updated" activeSort={activeSort} activeDir={activeDir} status={status} q={q} />
                <th>Agendado</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {sortedPosts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-(--muted)">
                    Nenhum post encontrado. Ajuste os filtros ou crie um novo.
                  </td>
                </tr>
              ) : (
                sortedPosts.map((post, index) => {
                  const statusValue = post.status ?? (post.published ? "published" : "draft");
                  const statusLabel = statusLabels[statusValue] ?? "Rascunho";
                  const siloSlug = post.silo?.slug ?? "";
                  const previewHref = `/admin/preview/${post.id}`;
                  const publicHref = buildPostCanonicalPath(siloSlug, post.slug) ?? `/${post.slug}`;
                  const hierarchy = hierarchyMap.get(post.id);
                  const rowTone =
                    index % 2 === 0
                      ? "bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(64,209,219,0.04)]"
                      : "hover:bg-[rgba(64,209,219,0.04)]";

                  return (
                    <tr key={post.id} className={`${rowTone} transition-colors`}>
                      <td>
                        <input
                          type="checkbox"
                          name="ids"
                          value={post.id}
                          form="deleteForm"
                          className="h-4 w-4 rounded border-(--border-strong)"
                          aria-label={`Selecionar ${post.title}`}
                        />
                      </td>

                      <td>
                        <span className={statusTone(statusValue)}>{statusLabel}</span>
                      </td>

                      <td>
                        {post.hero_image_url ? (
                          <img
                            src={post.hero_image_url}
                            alt={post.hero_image_alt || "Capa"}
                            className="h-12 w-20 rounded-lg border border-(--border) object-cover"
                          />
                        ) : (
                          <span className="text-[11px] text-(--muted-2)">Sem capa</span>
                        )}
                      </td>

                      <td className="text-(--text)">
                        <div className="min-w-[270px]">
                          <p className="text-[13px] font-semibold leading-snug text-(--text)">{post.title}</p>
                          <p className="mt-1 break-all rounded border border-[rgba(64,209,219,0.2)] bg-[rgba(64,209,219,0.06)] px-1.5 py-1 font-mono text-[11px] leading-snug text-(--brand-hot)">
                            /{post.slug}
                          </p>
                        </div>
                      </td>

                      <td>{post.silo?.name ?? "-"}</td>

                      <td>
                        {hierarchy ? (
                          <div className="leading-tight">
                            <div className="font-semibold text-(--text)">{hierarchy.label}</div>
                            <div className="text-[11px] uppercase tracking-[0.08em] text-(--muted-2)">
                              {typeof hierarchy.position === "number" ? `#${hierarchy.position}` : "Sem posição"}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>{formatDate(post.updated_at)}</td>
                      <td>{formatDate(post.scheduled_at)}</td>

                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          <Link className="admin-button-soft min-h-[34px] px-3 py-1.5 text-[11px]" href={`/admin/editor/${post.id}`}>
                            Editar
                          </Link>
                          <Link className="admin-button-soft min-h-[34px] px-3 py-1.5 text-[11px]" href={previewHref} target="_blank" rel="noreferrer">
                            Preview
                          </Link>
                          {post.published ? (
                            <Link className="admin-button-ghost min-h-[34px] px-3 py-1.5 text-[11px]" href={publicHref} target="_blank" rel="noreferrer">
                              URL pública
                            </Link>
                          ) : null}
                          <form action={setPublishState}>
                            <input type="hidden" name="id" value={post.id} />
                            <input type="hidden" name="published" value={post.published ? "false" : "true"} />
                            <button type="submit" className="admin-button-primary min-h-[34px] px-3 py-1.5 text-[11px]">
                              {post.published ? "Despublicar" : "Publicar"}
                            </button>
                          </form>
                          <details className="group">
                            <summary className="admin-button-soft min-h-[34px] cursor-pointer list-none px-3 py-1.5 text-[11px]">Agendar</summary>
                            <form action={schedulePost} className="mt-2 flex flex-wrap items-center gap-2">
                              <input type="hidden" name="id" value={post.id} />
                              <input
                                type="datetime-local"
                                name="scheduled_at"
                                className="admin-input min-h-[34px] min-w-[190px] text-[12px]"
                                defaultValue={post.scheduled_at ? post.scheduled_at.slice(0, 16) : ""}
                              />
                              <button type="submit" className="admin-button-soft min-h-[34px] px-3 py-1.5 text-[11px]">
                                Salvar
                              </button>
                            </form>
                          </details>
                          <form action={bulkDeletePosts as any}>
                            <input type="hidden" name="ids" value={post.id} />
                            <input type="hidden" name="confirm_intent" value={post.slug} />
                            <button type="submit" className="admin-button-danger min-h-[34px] px-3 py-1.5 text-[11px]">
                              Apagar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="admin-kpi">
      <div className="admin-kpi-label">{label}</div>
      <div className="admin-kpi-value">{value}</div>
      <div className="admin-kpi-helper">{helper}</div>
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex min-h-[30px] items-center gap-2 rounded-md border border-(--border) bg-(--surface-muted) px-2.5 text-xs">
      <span className="font-bold text-(--text-strong)">{value}</span>
      <span className="font-semibold uppercase text-(--muted)">{label}</span>
    </div>
  );
}

function DistributionChip({ label, count }: { label: string; count: number }) {
  const delta = count - 2;
  const tone =
    delta === 0
      ? "border-[rgba(64,209,219,0.35)] bg-[rgba(64,209,219,0.1)] text-[rgba(218,255,255,0.96)]"
      : delta > 0
        ? "border-[rgba(249,73,76,0.35)] bg-[rgba(249,73,76,0.12)] text-[rgba(255,220,220,0.96)]"
        : "border-[rgba(167,157,77,0.35)] bg-[rgba(167,157,77,0.12)] text-[rgba(255,247,210,0.96)]";

  return (
    <div className={`rounded-md border px-2.5 py-1 text-[10px] ${tone}`}>
      <span className="font-semibold">{label}</span>
      <span className="ml-2 text-[10px] uppercase tracking-[0.08em]">{count} posts</span>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSort,
  activeDir,
  status,
  q,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: SortKey;
  activeDir: SortDir;
  status?: string;
  q?: string;
}) {
  const isActive = activeSort === sortKey;
  const href = buildSortHref({ sortKey, activeSort, activeDir, status, q });
  const nextDirection = isActive ? (activeDir === "asc" ? "desc" : "asc") : getDefaultDirection(sortKey);

  return (
    <th aria-sort={isActive ? (activeDir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={href}
        title={`Ordenar por ${label} (${nextDirection})`}
        className="inline-flex items-center gap-1.5 hover:text-(--text)"
      >
        <span>{label}</span>
        {isActive ? (
          <span className="text-[10px] uppercase tracking-[0.08em] text-(--muted-2)">{activeDir}</span>
        ) : null}
      </Link>
    </th>
  );
}
