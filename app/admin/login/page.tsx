import { redirect } from "next/navigation";
import { getAdminEmail, isAdminAuthDisabled } from "@/lib/admin/settings";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const revalidate = 0;

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (isAdminAuthDisabled()) {
    redirect("/admin");
  }

  const { next } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <header className="admin-pane p-4">
        <p className="text-xs text-(--muted-2)">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-(--muted)">Entre com seu e-mail e senha de administrador para acessar o painel.</p>
      </header>

      <AdminLoginForm
        nextPath={next ?? "/admin"}
        initialEmail={process.env.NODE_ENV === "development" ? getAdminEmail() : undefined}
      />
    </div>
  );
}
