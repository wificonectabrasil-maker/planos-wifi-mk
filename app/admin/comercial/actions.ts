"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { getTursoClient } from "@/lib/database/client";

// Private historical requests remain accessible to authorized administrators.
export async function updateLeadStatus(form: FormData) {
  await requireAdminSession();
  const status = String(form.get("status"));
  const id = String(form.get("id"));
  if (!["new", "contacted", "closed"].includes(status) || !/^[0-9a-f-]{36}$/.test(id)) throw new Error("Dados inválidos.");
  await getTursoClient().execute({ sql: "UPDATE telecom_leads SET status=? WHERE id=?", args: [status, id] });
  revalidatePath("/admin/solicitacoes");
}
