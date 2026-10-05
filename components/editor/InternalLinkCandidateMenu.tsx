"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import { Check, X, Pencil } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";

export function InternalLinkCandidateMenu({ editor }: { editor: Editor | null }) {
  const { meta, silos } = useEditorContext();
  if (!editor) return null;

  const currentSilo = silos.find((silo) => silo.id === meta.siloId);
  const siloSlug = currentSilo?.slug ?? "";

  const getAttrs = () => editor.getAttributes("internalLinkCandidate") as any;

  const computeHref = (attrs: any) => {
    if (attrs?.href) return attrs.href as string;
    if (attrs?.slug) {
      if (String(attrs.slug).startsWith("/")) return String(attrs.slug);
      if (siloSlug) return `/${siloSlug}/${attrs.slug}`;
      return `/${attrs.slug}`;
    }
    return "";
  };

  const approve = () => {
    const attrs = getAttrs();
    const href = computeHref(attrs);
    if (!href) return;
    editor
      .chain()
      .focus()
      .extendMarkRange("internalLinkCandidate")
      .setLink({
        href,
        target: null,
        rel: null,
        "data-link-type": "internal",
        "data-post-id": attrs?.postId ?? null,
      } as any)
      .unsetMark("internalLinkCandidate")
      .run();
  };

  const reject = () => {
    editor.chain().focus().extendMarkRange("internalLinkCandidate").unsetMark("internalLinkCandidate").run();
  };

  const changeTarget = () => {
    const attrs = getAttrs();
    const current = attrs?.slug || attrs?.href || "";
    const next = window.prompt("Novo slug ou URL", current);
    if (!next) return;
    const nextSlug = next.startsWith("/") || next.startsWith("http") ? null : next;
    const nextHref = next.startsWith("http") || next.startsWith("/")
      ? next
      : siloSlug
        ? `/${siloSlug}/${next}`
        : `/${next}`;

    editor
      .chain()
      .focus()
      .extendMarkRange("internalLinkCandidate")
      .setMark("internalLinkCandidate", {
        ...attrs,
        slug: nextSlug ?? attrs?.slug ?? null,
        href: nextHref,
        status: "pending",
      })
      .run();
  };

  return (
    <BubbleMenu
      pluginKey="internalLinkCandidateMenu"
      editor={editor}
      shouldShow={({ editor }) => editor.isActive("internalLinkCandidate")}
    >
      <div className="flex items-center gap-1 rounded-lg border border-(--border) bg-white p-1 shadow-lg">
        <button
          onClick={approve}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
          title="Aprovar link"
        >
          <Check size={12} />
          Aprovar
        </button>
        <button
          onClick={reject}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
          title="Rejeitar sugestão"
        >
          <X size={12} />
          Rejeitar
        </button>
        <button
          onClick={changeTarget}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-(--muted) hover:bg-(--surface-muted)"
          title="Trocar alvo"
        >
          <Pencil size={12} />
          Trocar alvo
        </button>
      </div>
    </BubbleMenu>
  );
}

