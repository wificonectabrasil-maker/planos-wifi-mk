import Link from "next/link";
import { createSiloAction } from "@/app/admin/silos/actions";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function NewSiloPage() {
    await requireAdminSession();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-(--text)">Novo Silo</h1>
                    <p className="text-sm text-(--muted-2)">Crie um novo hub de conteúdo.</p>
                </div>
                <Link
                    href="/admin/silos"
                    className="rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm font-semibold text-(--muted) hover:bg-(--surface-muted)"
                >
                    Voltar
                </Link>
            </div>

            <form action={createSiloAction} className="max-w-2xl space-y-5 rounded-xl border border-(--border) bg-(--surface) p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome">
                        <input
                            name="name"
                            required
                            className="w-full rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) outline-none"
                            placeholder="Ex: Mobilidade e Passeio"
                        />
                    </Field>
                    <Field label="Slug">
                        <input
                            name="slug"
                            required
                            className="w-full rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) outline-none"
                            placeholder="Ex: mobilidade-e-passeio"
                        />
                    </Field>
                </div>

                <Field label="Descrição curta">
                    <textarea
                        name="description"
                        rows={2}
                        className="w-full rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) outline-none"
                        placeholder="Resumo curto para o hub (1-2 linhas)."
                    />
                </Field>

                <Field label="Intro do hub (HTML simples)">
                    <textarea
                        name="pillar_content_html"
                        rows={5}
                        className="w-full rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) outline-none"
                        placeholder="<p>Introducao do hub...</p>"
                    />
                </Field>

                <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Menu order">
                        <input
                            name="menu_order"
                            type="number"
                            defaultValue={0}
                            className="w-full rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text) outline-none"
                        />
                    </Field>

                    <Field label="Ativo">
                        <label className="flex items-center gap-2 rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text)">
                            <input
                                id="is_active"
                                name="is_active"
                                type="checkbox"
                                defaultChecked
                                className="h-4 w-4 rounded border-(--border-strong)"
                            />
                            Hub publico ativo
                        </label>
                    </Field>

                    <Field label="Menu publico">
                        <label className="flex items-center gap-2 rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--text)">
                            <input
                                id="show_in_navigation"
                                name="show_in_navigation"
                                type="checkbox"
                                defaultChecked
                                className="h-4 w-4 rounded border-(--border-strong)"
                            />
                            Exibir no menu
                        </label>
                    </Field>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="submit"
                        className="rounded-md bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-(--paper) hover:bg-(--brand-accent)"
                    >
                        Criar silo
                    </button>
                </div>
            </form>
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
