"use client";

import Link from "next/link";
import { brandConfig } from "@/brand.config";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { FolderTree, FilePenLine, LayoutGrid, MessageCircle } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/comercial", label: "Atendimento", icon: MessageCircle, match: pathname => pathname.startsWith("/admin/comercial") },
  {
    href: "/admin",
    label: "Conteúdo",
    icon: LayoutGrid,
    match: (pathname) => pathname === "/admin",
  },
  {
    href: "/admin/silos",
    label: "Silos",
    icon: FolderTree,
    match: (pathname) => pathname.startsWith("/admin/silos"),
  },
  {
    href: "/admin/editor/new",
    label: "Novo post",
    icon: FilePenLine,
    match: (pathname) => pathname === "/admin/editor/new",
  },
];

const BRAND_NAME = brandConfig.name;
const BRAND_INITIALS = brandConfig.name.split(/\s+/).map(word => word[0]).slice(0,2).join("");
const BRAND_LOGO_SRC = brandConfig.logo;

function resolveHeaderCopy(pathname: string) {
  if (pathname.startsWith("/admin/comercial")) return { title: "Atendimento comercial", subtitle: "Pacotes e promoções apresentados no WhatsApp." };
  if (pathname.startsWith("/admin/solicitacoes")) return { title: "Solicitações", subtitle: "Interesses recebidos e acompanhamento do atendimento." };
  if (pathname.startsWith("/admin/editor/") && pathname !== "/admin/editor/new") {
    return {
      title: "Editor de posts",
      subtitle: "SEO, conteúdo e publicação num fluxo contínuo.",
    };
  }

  if (pathname.startsWith("/admin/silos/") && pathname !== "/admin/silos") {
    return {
      title: "Painel de silos",
      subtitle: "Estrutura, links internos e saúde editorial do hub.",
    };
  }

  if (pathname === "/admin/silos") {
    return {
      title: "Silos",
      subtitle: "Controle os hubs e a navegação editorial do projeto.",
    };
  }

  if (pathname === "/admin/editor/new") {
    return {
      title: "Novo post",
      subtitle: "Comece pelo foco da página e monte a estrutura com contexto.",
    };
  }

  return {
    title: "Cockpit editorial",
    subtitle: "Operação compacta para posts, silos e SEO técnico.",
  };
}

export function AdminHeader() {
  const pathname = usePathname();
  const copy = resolveHeaderCopy(pathname);
  const isEditorRoute = pathname.startsWith("/admin/editor/");
  const navButtonBase = isEditorRoute
    ? "inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] px-3 text-[11px] font-semibold shadow-[0_12px_20px_-22px_rgba(8,24,33,0.24)] transition"
    : "inline-flex h-10 items-center justify-center gap-2 rounded-[7px] px-3 text-[12px] font-semibold shadow-[0_14px_24px_-24px_rgba(8,24,33,0.24)] transition";

  return (
    <header className="admin-glass sticky top-0 z-40 border-b border-(--border-strong)">
      <div
        className={
          isEditorRoute
            ? "grid h-[56px] w-full grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] items-center gap-3 px-3 md:px-4"
            : "mx-auto flex h-[74px] max-w-[1800px] items-center justify-between gap-3 px-3 md:px-4"
        }
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-(--border-strong) bg-[#2a2a30] text-sm font-black tracking-[0.03em] text-(--brand-hot) ${isEditorRoute ? "h-9 w-9 text-[12px]" : "h-11 w-11"}`}>
            {BRAND_LOGO_SRC ? (
              <img src={BRAND_LOGO_SRC} alt={`${BRAND_NAME} logo`} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span>{BRAND_INITIALS}</span>
            )}
          </div>

          <div className="min-w-0">
            {!isEditorRoute ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--muted-2)">{BRAND_NAME} editor</p>
            ) : null}
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className={`truncate font-semibold leading-none text-(--text) ${isEditorRoute ? "text-[0.92rem]" : "text-[1.05rem]"}`}>{copy.title}</h1>
              <p className={`hidden truncate text-[11px] text-(--muted) ${isEditorRoute ? "xl:block" : "xl:block"}`}>{copy.subtitle}</p>
            </div>
          </div>
        </div>

        {isEditorRoute ? (
          <div
            id="admin-editor-center-slot"
            className="admin-scrollbar flex min-w-0 items-center justify-center overflow-x-auto overflow-y-hidden"
          />
        ) : null}

        <nav className={`flex shrink-0 items-center gap-1 md:gap-1.5 ${isEditorRoute ? "justify-self-end" : ""}`}>
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            const isPrimary = item.href === "/admin/editor/new";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={
                  isPrimary
                    ? `${navButtonBase} border border-[rgba(64,209,219,0.5)] bg-[linear-gradient(180deg,#40d1db_0%,#33b8c2_100%)] text-[#0d1117] font-bold`
                    : `${navButtonBase} border border-(--border-strong) bg-transparent text-(--text) ${active ? "border-[rgba(64,209,219,0.5)] bg-[rgba(64,209,219,0.1)] text-(--brand-accent)" : "hover:border-[rgba(96,165,250,0.35)] hover:bg-[rgba(96,165,250,0.06)]"}`
                }
                title={item.label}
              >
                <Icon size={14} />
                <span className={isEditorRoute ? "hidden lg:inline" : "hidden sm:inline"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
