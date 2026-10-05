import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Pencil } from "lucide-react";

const CTA_VARIANT_CLASS: Record<string, string> = {
  primary: "bg-(--brand-hot) text-white",
  secondary: "bg-white text-(--brand-hot) border border-(--brand-hot)",
  outline: "bg-white text-(--text) border border-(--border)",
};

const CTA_VARIANT_PUBLIC: Record<string, string> = {
  primary: "cta-primary",
  secondary: "cta-secondary",
  outline: "cta-outline",
};

const CtaComponent = ({ node, updateAttributes }: any) => {
  const { label, url, variant, vendor } = node.attrs;
  const variantKey = CTA_VARIANT_PUBLIC[variant] ? variant : "primary";
  const className = CTA_VARIANT_CLASS[variantKey] ?? CTA_VARIANT_CLASS.primary;

  return (
    <NodeViewWrapper className="my-6 not-prose">
      <div className="rounded-xl border border-(--border) bg-(--surface) p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-(--muted-2)">CTA Afiliado</p>
            <p className="text-sm font-semibold text-(--text)">{label || "COMPRE AGORA"}</p>
            <p className="text-[11px] text-(--muted)">{url || "(sem URL)"}</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-(--border) px-2 py-1 text-[11px] text-(--muted) hover:bg-(--surface-muted)"
            onClick={() => {
              const nextLabel = window.prompt("Texto do botão", label || "COMPRE AGORA");
              if (nextLabel !== null) updateAttributes({ label: nextLabel });
              const nextUrl = window.prompt("URL do CTA", url || "");
              if (nextUrl !== null) updateAttributes({ url: nextUrl });
            }}
          >
            <Pencil size={12} />
            Editar
          </button>
        </div>

        <div className="mt-4">
          <a
            href={url || "#"}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition ${className}`}
          >
            {label || "COMPRE AGORA"}
          </a>
          <span className="ml-3 text-[10px] uppercase text-(--muted-2)">{vendor || "amazon"}</span>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const AffiliateCta = Node.create({
  name: "affiliateCta",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      label: {
        default: "COMPRE AGORA",
        parseHTML: (element) => element.getAttribute("data-label"),
      },
      url: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-url"),
      },
      variant: {
        default: "primary",
        parseHTML: (element) => element.getAttribute("data-variant"),
      },
      vendor: {
        default: "amazon",
        parseHTML: (element) => element.getAttribute("data-vendor"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='affiliate-cta']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const variant = HTMLAttributes.variant || "primary";
    const className = CTA_VARIANT_PUBLIC[variant] ?? "cta-primary";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "affiliate-cta",
        "data-label": HTMLAttributes.label,
        "data-url": HTMLAttributes.url,
        "data-variant": variant,
        "data-vendor": HTMLAttributes.vendor,
        class: `affiliate-cta ${className}`,
      }),
      [
        "a",
        {
          href: HTMLAttributes.url || "#",
          target: "_blank",
          rel: "nofollow sponsored noopener noreferrer",
          class: "affiliate-cta__button",
        },
        HTMLAttributes.label || "COMPRE AGORA",
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaComponent);
  },
});

