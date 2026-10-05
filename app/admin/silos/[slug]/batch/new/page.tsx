import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetSiloBySlug } from "@/lib/db";
import { createBatchWithPosts } from "@/app/admin/silos/actions";

export const revalidate = 0;

export default async function NewBatchPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminSession();
  const { slug } = await params;
  const silo = await adminGetSiloBySlug(slug);
  if (!silo) return notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="rounded-3xl border border-(--border) bg-(--paper) p-8">
        <p className="text-xs text-(--muted-2)">Guardian do Silo</p>
        <h1 className="mt-2 text-2xl font-semibold">Novo pacote</h1>
        <p className="mt-2 text-sm text-(--muted)">Criar lote de posts para o silo {silo.name}.</p>
      </header>

      <form action={createBatchWithPosts} className="rounded-3xl border border-(--border) bg-(--paper) p-8 space-y-4">
        <input type="hidden" name="siloSlug" value={silo.slug} />
        <div className="space-y-2">
          <label className="text-xs text-(--muted-2)" htmlFor="name">Nome do pacote</label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
            placeholder="Pacote de posts"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-(--muted-2)" htmlFor="count">Quantidade de posts</label>
          <input
            id="count"
            name="count"
            type="number"
            min={3}
            max={10}
            defaultValue={5}
            className="w-full rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
          />
          <p className="text-[10px] text-(--muted-2)">Minimo 3 posts para fechar a malha.</p>
        </div>

        <button
          type="submit"
          className="rounded-xl border border-(--border) bg-(--brand-primary) px-4 py-2 text-xs font-semibold hover:bg-(--brand-primary)"
        >
          Criar lote e posts
        </button>
      </form>
    </div>
  );
}
