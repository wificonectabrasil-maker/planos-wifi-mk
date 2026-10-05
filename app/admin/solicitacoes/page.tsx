import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { getTursoClient } from "@/lib/database/client";
import { categoryLabels, type ServiceCategory } from "@/lib/telecom/catalog";
import { updateLeadStatus } from "../comercial/actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Histórico de solicitações",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminSession();
  const query = await searchParams;
  const status = ["new", "contacted", "closed"].includes(query.status || "")
    ? query.status
    : "";
  const result = await getTursoClient().execute({
    sql: `SELECT * FROM telecom_leads ${status ? "WHERE status=?" : ""} ORDER BY created_at DESC LIMIT 100`,
    args: status ? [status] : [],
  });
  return (
    <div className="space-y-4">
      <div className="admin-pane flex flex-wrap items-center justify-between gap-3 p-3">
        <div>
          <h2 className="text-lg font-semibold">HISTÓRICO DE SOLICITAÇÕES</h2>
          <p className="text-xs text-(--muted)">
            Registros anteriores ao atendimento exclusivo pelo WhatsApp.
            Não são recebidas novas solicitações pelo site.
          </p>
        </div>
        <Link href="/admin/comercial" className="admin-button">
          Atendimento comercial
        </Link>
      </div>
      <form className="admin-pane flex items-end gap-3 p-3">
        <label className="text-xs">
          Estado
          <select
            name="status"
            defaultValue={status}
            className="admin-input ml-3"
          >
            <option value="">Todos</option>
            <option value="new">Novos</option>
            <option value="contacted">Em atendimento</option>
            <option value="closed">Encerrados</option>
          </select>
        </label>
        <button className="admin-button" type="submit">
          Filtrar
        </button>
      </form>
      <div className="admin-pane overflow-x-auto p-3">
        <table className="admin-table w-full text-left text-xs">
          <thead>
            <tr>
              <th className="p-2">Protocolo / data</th>
              <th>Contato</th>
              <th>Endereço</th>
              <th>Interesse</th>
              <th>Consentimento</th>
              <th>Atendimento</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={String(row.id)}>
                <td className="p-2">
                  {String(row.protocol)}
                  <br />
                  {new Date(String(row.created_at)).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </td>
                <td>
                  {String(row.name)}
                  <br />
                  <a href={`tel:+55${row.phone}`}>{String(row.phone)}</a>
                </td>
                <td>
                  CEP {String(row.cep)}
                  <br />
                  {String(row.address)}
                </td>
                <td>
                  {categoryLabels[String(row.service) as ServiceCategory]}
                  <br />
                  {String(row.interest)}
                  <br />
                  <span className="text-(--muted)">
                    {String(row.source_path)}
                  </span>
                </td>
                <td>
                  {new Date(String(row.consent_at)).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                  <br />
                  Política {String(row.privacy_version)}
                </td>
                <td>
                  <form
                    action={updateLeadStatus}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={String(row.id)} />
                    <select
                      name="status"
                      defaultValue={String(row.status)}
                      className="admin-input"
                    >
                      <option value="new">Novo</option>
                      <option value="contacted">Em atendimento</option>
                      <option value="closed">Encerrado</option>
                    </select>
                    <button type="submit" className="admin-button">
                      Salvar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.rows.length ? (
          <p className="py-4 text-xs text-(--muted)">
            Nenhuma solicitação neste filtro.
          </p>
        ) : null}
      </div>
    </div>
  );
}
