"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Editor } from "@tiptap/react";

const DEFAULTS = {
  amazon_primary: "COMPRE AGORA",
  amazon_secondary: "VERIFICAR DISPONIBILIDADE",
  internal: "SAIBA MAIS",
  custom: "Clique aqui",
};

const DEFAULT_COLORS: Record<string, { bg: string; text: string }> = {
  amazon_primary: { bg: "#ff9900", text: "#111827" },
  amazon_secondary: { bg: "#1f7a4d", text: "#ffffff" },
  internal: { bg: "#0f766e", text: "#ffffff" },
  custom: { bg: "#f36141", text: "#ffffff" },
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
};

export default function CtaButtonDialog({ isOpen, onClose, editor }: Props) {
  const [variant, setVariant] = useState<"amazon_primary" | "amazon_secondary" | "internal" | "custom">("amazon_secondary");
  const [label, setLabel] = useState(DEFAULTS.amazon_secondary);
  const [href, setHref] = useState("");
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [bgColor, setBgColor] = useState(DEFAULT_COLORS.amazon_secondary.bg);
  const [textColor, setTextColor] = useState(DEFAULT_COLORS.amazon_secondary.text);

  if (!isOpen) return null;

  const updateVariant = (next: "amazon_primary" | "amazon_secondary" | "internal" | "custom") => {
    setVariant(next);
    setLabel(DEFAULTS[next]);
    setBgColor(DEFAULT_COLORS[next].bg);
    setTextColor(DEFAULT_COLORS[next].text);
  };

  const handleInsert = () => {
    if (!editor) return;
    const isAmazon = variant.startsWith("amazon");
    const isInternal = variant === "internal" || href.startsWith("/");
    const target = isAmazon ? "_blank" : isInternal ? "_self" : "_blank";
    const rel = isAmazon ? "sponsored nofollow noopener" : isInternal ? "follow" : "nofollow noopener";

    editor
      .chain()
      .focus()
      .insertContent({
        type: "cta_button",
        attrs: {
          label,
          href,
          variant,
          size,
          align,
          bgColor,
          textColor,
          fullWidth: false,
          spacingY: "md",
          visibleDesktop: true,
          visibleTablet: true,
          visibleMobile: true,
          responsive: null,
          rel,
          target,
        },
      })
      .run();

    onClose();
    setVariant("amazon_secondary");
    setLabel(DEFAULTS.amazon_secondary);
    setHref("");
    setSize("md");
    setAlign("center");
    setBgColor(DEFAULT_COLORS.amazon_secondary.bg);
    setTextColor(DEFAULT_COLORS.amazon_secondary.text);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-32">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-6 py-4">
          <h3 className="text-lg font-bold text-zinc-800">Inserir CTA</h3>
          <button onClick={onClose}>
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="text-xs font-bold uppercase text-zinc-500">Preset</label>
            <select
              className="mt-2 w-full rounded border border-zinc-200 p-2 text-sm"
              value={variant}
              onChange={(event) => updateVariant(event.target.value as any)}
            >
              <option value="amazon_primary">Amazon - COMPRE AGORA</option>
              <option value="amazon_secondary">Amazon - VERIFICAR DISPONIBILIDADE</option>
              <option value="internal">Interno</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-zinc-500">Texto do botão</label>
            <input
              className="mt-2 w-full rounded border border-zinc-200 p-2 text-sm"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-zinc-500">URL</label>
            <input
              className="mt-2 w-full rounded border border-zinc-200 p-2 text-sm"
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase text-zinc-500">Tamanho</label>
              <select
                className="mt-2 w-full rounded border border-zinc-200 p-2 text-sm"
                value={size}
                onChange={(event) => setSize(event.target.value as any)}
              >
                <option value="sm">Pequeno</option>
                <option value="md">Medio</option>
                <option value="lg">Grande</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold uppercase text-zinc-500">Alinhamento</label>
              <select
                className="mt-2 w-full rounded border border-zinc-200 p-2 text-sm"
                value={align}
                onChange={(event) => setAlign(event.target.value as any)}
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase text-zinc-500">Cor do botão</label>
              <input
                type="color"
                className="mt-2 h-10 w-full rounded border border-zinc-200 p-1"
                value={bgColor}
                onChange={(event) => setBgColor(event.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold uppercase text-zinc-500">Cor do texto</label>
              <input
                type="color"
                className="mt-2 h-10 w-full rounded border border-zinc-200 p-1"
                value={textColor}
                onChange={(event) => setTextColor(event.target.value)}
              />
            </div>
          </div>

          {variant.startsWith("amazon") ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
              Links Amazon sao sempre sponsored/nofollow e abrem em nova aba.
            </div>
          ) : variant === "internal" ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-700">
              Links internos abrem na mesma aba e sao sempre follow.
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={handleInsert}
            className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-bold text-white hover:bg-orange-600"
          >
            Inserir CTA
          </button>
        </div>
      </div>
    </div>
  );
}
