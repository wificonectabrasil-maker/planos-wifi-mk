"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

type YoutubeAttrs = {
  src?: string;
};

function normalizeYoutubeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const url = trimmed.match(/(https?:\/\/[^ ]+)/i)?.[1] ?? trimmed;

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;

  return url;
}

function YoutubeEmbedView(props: any) {
  const attrs = props.node.attrs as YoutubeAttrs;

  const edit = () => {
    const next = window.prompt("URL do YouTube", attrs.src ?? "");
    if (next === null) return;
    const normalized = normalizeYoutubeUrl(next);
    props.updateAttributes({ src: normalized });
  };

  return (
    <NodeViewWrapper className="rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-zinc-100">
        {attrs.src ? (
          <iframe
            src={attrs.src}
            title="YouTube"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            Cole a URL do YouTube
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="truncate">{attrs.src || "Sem URL"}</span>
        <button
          type="button"
          onClick={edit}
          className="rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
        >
          Editar
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const YoutubeEmbed = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-youtube]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as any;
    return [
      "div",
      mergeAttributes({
        "data-youtube": attrs.src,
        class: "youtube-embed",
      }),
      [
        "iframe",
        {
          src: attrs.src,
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
          title: "YouTube",
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YoutubeEmbedView);
  },
});

export { normalizeYoutubeUrl };
