import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminListSilos } from "@/lib/db";

export const revalidate = 0;

export default async function AdminSilosPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  await requireAdminSession();
  const { deleted, error } = await searchParams;
  const silos = await adminListSilos();

  const activeCount = silos.filter((silo) => silo.is_active !== false).length;
  const navCount = silos.filter((silo) => silo.show_in_navigation !== false).length;

  return (
    <div className="space-y-4 pb-3">
      {deleted === "1" ? (
        <div className="admin-pane px-4 py-3 text-sm text-(--admin-positive)">Silo excluído com sucesso.</div>
      ) : null}
      {error === "delete_failed" ? (
        <div className="admin-pane px-4 py-3 text-sm text-(--admin-danger)">Falha ao excluir o silo.</div>
      ) : null}

      <section className="admin-pane p-4 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-(--muted-2)">Arquitetura do site</p>
            <h2 className="mt-1 text-2xl font-semibold text-(--text)">Silos e hubs</h2>
            <p className="mt-1 text-sm text-(--muted)">
              Padronize grupos, contraste a saúde editorial e mantenha o hub sempre navegável.
            </p>
          </div>

          <Link href="/admin/silos/new" className="admin-button-primary">
            Novo silo
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatCard label="Silos" value={silos.length} helper="Estruturas cadastradas" />
          <StatCard label="Ativos" value={activeCount} helper="Hubs públicos ligados" />
          <StatCard label="No menu" value={navCount} helper="Rotas expostas na navegação" />
        </div>
      </section>

      <section className="admin-table-shell">
        <div className="admin-scrollbar overflow-x-auto">
          <table className="admin-table min-w-[860px]">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Slug</th>
                <th>Menu</th>
                <th>Ativo</th>
                <th>Nav pública</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {silos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-(--muted)">
                    Nenhum silo encontrado.
                  </td>
                </tr>
              ) : (
                silos.map((silo, index) => (
                  <tr
                    key={silo.id}
                    className={`transition-colors ${index % 2 === 0
                      ? "bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(64,209,219,0.04)]"
                      : "hover:bg-[rgba(64,209,219,0.04)]"
                      }`}
                  >
                    <td className="text-(--text)">
                      <div className="font-semibold text-(--text)">{silo.name}</div>
                    </td>
                    <td className="text-[12px] text-(--muted-2)">/{silo.slug}</td>
                    <td>{silo.menu_order ?? 0}</td>
                    <td>
                      <span className={silo.is_active ? "admin-badge admin-badge-positive" : "admin-badge admin-badge-neutral"}>
                        {silo.is_active ? "Ligado" : "Pausado"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          silo.show_in_navigation === false
                            ? "admin-badge admin-badge-neutral"
                            : "admin-badge admin-badge-warning"
                        }
                      >
                        {silo.show_in_navigation === false ? "Oculto" : "Visível"}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/silos/${silo.slug}`} className="admin-button-soft min-h-[34px] px-3 py-1.5 text-[11px]">
                        Abrir painel
                      </Link>
                    </td>
                  </tr>
                ))
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
