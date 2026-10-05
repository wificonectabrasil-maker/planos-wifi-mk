"use client";

import Link from "next/link";
import { ArrowLeft, Laptop, MonitorSmartphone, Smartphone, Tablet, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  breadcrumb: Array<{ label: string; href?: string }>;
  status: "draft" | "review" | "scheduled" | "published";
  saving?: boolean;
  previewMode: "desktop" | "tablet" | "mobile";
  onPreviewChange: (mode: "desktop" | "tablet" | "mobile") => void;
  onSave: () => void;
  onPublish: () => void;
  rightExtra?: ReactNode;
};

function statusTone(status: Props["status"]) {
  if (status === "published") return "admin-badge admin-badge-positive";
  if (status === "scheduled") return "admin-badge admin-badge-warning";
  if (status === "review") return "admin-badge admin-badge-warning";
  return "admin-badge admin-badge-neutral";
}

export function EditorHeader({
  breadcrumb,
  status,
  saving = false,
  previewMode,
  onPreviewChange,
  onSave,
  onPublish,
  rightExtra,
}: Props) {
  return (
    <div className="flex h-[60px] items-center gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-(--border) bg-(--surface) px-2 py-1 text-[11px] font-semibold text-(--text) hover:bg-(--surface-muted)"
        >
          <ArrowLeft size={14} />
          Admin
        </Link>
        <div className="flex items-center gap-1 text-[11px] text-(--muted-2)">
          {breadcrumb.map((item, index) => (
            <span key={item.label} className="flex items-center gap-1">
              {index > 0 ? <span className="text-(--muted-2)">/</span> : null}
              {item.href ? (
                <Link href={item.href} className="hover:text-(--text)">
                  {item.label}
                </Link>
              ) : (
                <span className="text-(--text) font-semibold">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-(--muted)">
        <span className={`inline-flex items-center gap-2 px-3 py-1 ${statusTone(status)}`}>
          {status === "draft" && "Rascunho"}
          {status === "review" && "Revisão"}
          {status === "scheduled" && "Agendado"}
          {status === "published" && "Publicado"}
        </span>
        {saving ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-(--muted-2)">
            <Loader2 size={12} className="animate-spin" />
            Salvando...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-(--muted-2)">
            <MonitorSmartphone size={12} />
            Pronto
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-(--border) bg-(--surface) p-1">
          <button
            type="button"
            onClick={() => onPreviewChange("desktop")}
            className={`rounded-full p-1 ${
              previewMode === "desktop"
                ? "border border-[rgba(64,209,219,0.52)] bg-(--surface-muted) text-(--brand-accent)"
                : "text-(--muted-2)"
            }`}
            title="Desktop"
          >
            <Laptop size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPreviewChange("tablet")}
            className={`rounded-full p-1 ${
              previewMode === "tablet"
                ? "border border-[rgba(64,209,219,0.52)] bg-(--surface-muted) text-(--brand-accent)"
                : "text-(--muted-2)"
            }`}
            title="Tablet"
          >
            <Tablet size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPreviewChange("mobile")}
            className={`rounded-full p-1 ${
              previewMode === "mobile"
                ? "border border-[rgba(64,209,219,0.52)] bg-(--surface-muted) text-(--brand-accent)"
                : "text-(--muted-2)"
            }`}
            title="Mobile"
          >
            <Smartphone size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-xs font-semibold text-(--text) hover:bg-(--surface-muted)"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="admin-button-primary rounded-md px-4 py-2 text-xs"
        >
          Publicar
        </button>
        {rightExtra}
      </div>
    </div>
  );
}

