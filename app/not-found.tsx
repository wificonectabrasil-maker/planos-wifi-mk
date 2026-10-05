import Link from "next/link";

export default function NotFound() {
  return (
    <div className="brand-card rounded-3xl p-8">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-(--muted)">
        Verifique o endereço ou volte para a home.
      </p>
      <Link href="/" className="mt-6 inline-flex rounded-xl border border-(--border) bg-(--surface-muted) px-4 py-2 text-sm hover:bg-(--brand-primary)">
        Ir para a home
      </Link>
    </div>
  );
}

