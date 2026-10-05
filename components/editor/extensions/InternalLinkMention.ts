"use client";

import Mention from "@tiptap/extension-mention";
import type { SuggestionOptions } from "@tiptap/suggestion";

type Item = { id: string; title: string; slug: string; siloSlug: string };

async function fetchItems(query: string): Promise<Item[]> {
  const url = `/api/admin/mentions?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []) as Item[];
}

function renderList() {
  let dom: HTMLDivElement | null = null;
  let ul: HTMLDivElement | null = null;
  let currentIndex = 0;
  let currentItems: Item[] = [];

  function select(index: number, command: (item: Item) => void) {
    const item = currentItems[index];
    if (item) command(item);
  }

  return {
    onStart: (props: any) => {
      currentItems = props.items;
      currentIndex = 0;

      dom = document.createElement("div");
      dom.className = "rounded-2xl border border-(--border) bg-[color:rgba(255,255,255,0.96)] p-2 shadow-xl";

      ul = document.createElement("div");
      ul.className = "flex flex-col";
      dom.appendChild(ul);

      props.clientRect && Object.assign(dom.style, { position: "absolute", zIndex: 9999 });

      document.body.appendChild(dom);
      update(props);
    },

    onUpdate: (props: any) => {
      currentItems = props.items;
      update(props);
    },

    onKeyDown: (props: any) => {
      if (props.event.key === "ArrowDown") {
        currentIndex = (currentIndex + 1) % currentItems.length;
        update(props);
        return true;
      }

      if (props.event.key === "ArrowUp") {
        currentIndex = (currentIndex - 1 + currentItems.length) % currentItems.length;
        update(props);
        return true;
      }

      if (props.event.key === "Enter") {
        select(currentIndex, props.command);
        return true;
      }

      return false;
    },

    onExit: () => {
      dom?.remove();
      dom = null;
      ul = null;
    },
  };

  function update(props: any) {
    if (!dom || !ul) return;
    const list = ul;

    const rect = props.clientRect?.();
    if (rect) {
      dom.style.left = rect.left + "px";
      dom.style.top = rect.bottom + 8 + "px";
    }

    list.innerHTML = "";

    const items: Item[] = props.items ?? [];
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "px-3 py-2 text-xs text-(--muted-2)";
      empty.textContent = "Nenhum artigo encontrado";
      list.appendChild(empty);
      return;
    }

    items.slice(0, 8).forEach((item, idx) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `text-left rounded-xl px-3 py-2 text-xs transition ${
        idx === currentIndex
          ? "bg-(--brand-primary) text-(--ink)"
          : "text-(--muted) hover:bg-(--surface-muted)"
      }`;

      const title = document.createElement("div");
      title.className = "text-(--ink)";
      title.textContent = item.title;

      const meta = document.createElement("div");
      meta.className = "text-[10px] text-(--muted-2)";
      meta.textContent = `/${item.siloSlug}/${item.slug}`;

      row.appendChild(title);
      row.appendChild(meta);
      row.onclick = () => props.command(item);
      list.appendChild(row);
    });
  }
}

const suggestion: Partial<SuggestionOptions<Item>> = {
  char: "@",
  startOfLine: false,
  items: async ({ query }) => {
    if (!query || query.length < 2) return [];
    return await fetchItems(query);
  },
  render: renderList as any,
  command: ({ editor, range, props }) => {
    const href = `/${props.siloSlug}/${props.slug}`;
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        {
          type: "mention",
          attrs: {
            id: props.id,
            label: props.title,
            href,
          },
        },
        { type: "text", text: " " },
      ])
      .run();
  },
};

export const InternalLinkMention = Mention.extend({
  name: "mention",

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      href: { default: null },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const href = (node.attrs as any).href || "#";
    const label = (node.attrs as any).label || "";
    const postId = (node.attrs as any).id || null;

    return [
      "a",
      {
        ...HTMLAttributes,
        href,
        "data-link-type": "mention",
        "data-post-id": postId,
        "data-entity": "mention",
        class: "internal-link underline underline-offset-4 decoration-(--brand-primary) text-(--brand-hot)",
      },
      label,
    ];
  },
}).configure({
  suggestion: suggestion as any,
});
