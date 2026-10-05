import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminCreateDraftPost, adminListSilos, detectMissingPostColumns } from "@/lib/db";

export const revalidate = 0;
const MIGRATION_PATH =
  "pnpm run db:migrate";
const IS_PROD = process.env.NODE_ENV === "production";

function DevCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full justify-center p-8">
      <div className="w-full max-w-3xl space-y-6 rounded-3xl border border-(--border) bg-(--surface) p-8 shadow-lg">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">{badge}</p>
          <h1 className="text-3xl font-semibold text-(--text)">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function formatErrorDetails(error: any) {
  const lines = [
    error?.message ? `message: ${error.message}` : null,
    error?.details ? `details: ${error.details}` : null,
    error?.hint ? `hint: ${error.hint}` : null,
    error?.code ? `code: ${error.code}` : null,
  ].filter(Boolean);

  return lines.length ? lines.join("\n") : "Sem detalhes do erro. Verifique o console do servidor.";
}

export default async function NewEditorPage() {
  await requireAdminSession();
  const missing = await detectMissingPostColumns();
  if (missing.length) {
    const strictMessage = `Colunas ausentes em posts: ${missing.join(
      ", "
    )}. Rode a migration ${MIGRATION_PATH} e depois pnpm run db:migrate`;

    if (IS_PROD) {
      throw new Error(strictMessage);
    }

    return (
      <DevCard title="Atualize o schema do Turso" badge="Database not migrated">
        <p className="text-sm text-(--muted)">
          O editor precisa de algumas colunas novas em <code className="text-orange-200">posts</code>. Rode a
          migration de sincronizacao e recarregue esta tela.
        </p>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--muted-2)">Colunas faltando</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((col) => (
              <span key={col} className="rounded-full bg-(--surface-muted) px-3 py-1 text-xs text-(--text)">
                {col}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--muted-2)">SQL para aplicar</p>
          <pre className="overflow-auto rounded-xl bg-(--surface-muted) p-4 text-xs text-(--text)">
{`-- Cole o conteúdo do arquivo abaixo no SQL Editor:
-- ${MIGRATION_PATH}
-- Execute as migrations pendentes:
pnpm run db:migrate`}
          </pre>
        </div>

        <p className="text-xs text-(--muted-2)">Depois de aplicar a migration, recarregue esta página.</p>
      </DevCard>
    );
  }

  const silos = await adminListSilos();
  const siloId = silos[0]?.id ?? null;
  const slug = `draft-${Date.now().toString(36)}`;

  let postId: string | null = null;
  try {
    const post = await adminCreateDraftPost({
      silo_id: siloId ?? undefined,
      title: "Novo post",
      slug,
      target_keyword: "keyword base",
      supporting_keywords: [],
      meta_description: null,
      entities: [],
    });
    postId = post.id;
  } catch (error: any) {
    console.error("Falha ao criar rascunho", error);

    if (!IS_PROD) {
      return (
        <DevCard title="Falha ao criar rascunho" badge="Draft error">
          <p className="text-sm text-(--muted)">
            Verifique as credenciais do Turso, permissões do banco e se as migrations foram aplicadas.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--muted-2)">Detalhes</p>
            <pre className="overflow-auto rounded-xl bg-(--surface-muted) p-4 text-xs text-(--text)">{formatErrorDetails(error)}</pre>
          </div>
          <p className="text-xs text-(--muted-2)">
            Se o erro indicar schema desatualizado, aplique {MIGRATION_PATH} e rode NOTIFY pgrst.
          </p>
        </DevCard>
      );
    }

    const message =
      typeof error?.message === "string" && error.message.includes("column")
        ? `${error.message} - aplique a migration ${MIGRATION_PATH} e rode pnpm run db:migrate`
        : "Falha ao criar rascunho. Confirme se as migrations do Turso foram aplicadas.";
    throw new Error(message);
  }

  if (!postId) {
    throw new Error("Falha ao criar rascunho. ID não retornado pelo Turso.");
  }

  redirect(`/admin/editor/${postId}`);
}
