"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

type AdminHeaderState = {
  title?: ReactNode;
  subtitle?: ReactNode;
  statusLabel?: ReactNode;
  statusTone?: "neutral" | "info" | "warning" | "success";
  saving?: boolean;
  actions?: ReactNode;
  layout?: "padded" | "full";
  custom?: ReactNode;
};

type AdminShellContextValue = {
  header: AdminHeaderState;
  setHeader: (next: AdminHeaderState) => void;
  resetHeader: () => void;
};

const defaultHeader: AdminHeaderState = {
  title: "Admin",
  subtitle: "Painel de controle",
  statusLabel: undefined,
  statusTone: "neutral",
  saving: false,
  actions: null,
  layout: "padded",
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function AdminShell({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<AdminHeaderState>(defaultHeader);

  const setHeader = useCallback((next: AdminHeaderState) => {
    setHeaderState({ ...defaultHeader, ...next });
  }, []);

  const resetHeader = useCallback(() => {
    setHeaderState(defaultHeader);
  }, []);

  const value = useMemo(() => ({ header, setHeader, resetHeader }), [header, resetHeader, setHeader]);

  const statusTone =
    header.statusTone === "success"
      ? "text-emerald-600 border-emerald-200 bg-emerald-50"
      : header.statusTone === "warning"
        ? "text-amber-600 border-amber-200 bg-amber-50"
        : header.statusTone === "info"
          ? "text-blue-600 border-blue-200 bg-blue-50"
          : "text-zinc-600 border-zinc-200 bg-white";

  return (
    <AdminShellContext.Provider value={value}>
      <div className="h-screen overflow-hidden bg-zinc-100">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-[60px] items-center border-b border-zinc-200 bg-white px-4">
          {header.custom ? (
            header.custom
          ) : (
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex flex-col">
                {typeof header.title === "string" ? (
                  <span className="text-xs font-semibold text-zinc-900">{header.title}</span>
                ) : (
                  header.title
                )}
                {header.subtitle ? (
                  typeof header.subtitle === "string" ? (
                    <span className="text-[11px] text-zinc-500">{header.subtitle}</span>
                  ) : (
                    header.subtitle
                  )
                ) : null}
                <nav className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                  <a className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100" href="/admin">
                    Conteudo
                  </a>
                  <a className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100" href="/admin/silos">
                    Silos
                  </a>
                  <a className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100" href="/admin/editor/new">
                    Novo post
                  </a>
                </nav>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-600">
                {header.statusLabel ? (
                  typeof header.statusLabel === "string" ? (
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${statusTone}`}>
                      <Clock size={12} />
                      {header.statusLabel}
                    </span>
                  ) : (
                    header.statusLabel
                  )
                ) : null}
                {header.saving ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                    <Loader2 size={12} className="animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                    <CheckCircle2 size={12} />
                    Pronto
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">{header.actions}</div>
            </div>
          )}
        </header>

        <main className="h-full pt-[60px]">
          {header.layout === "full" ? (
            <div className="h-full">{children}</div>
          ) : (
            <div className="h-full overflow-auto px-6 py-6">{children}</div>
          )}
        </main>
      </div>
    </AdminShellContext.Provider>
  );
}

export function useAdminShell() {
  const ctx = useContext(AdminShellContext);
  if (!ctx) {
    throw new Error("useAdminShell must be used within AdminShell");
  }
  return ctx;
}
