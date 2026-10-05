"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { List, X, ChevronRight } from "lucide-react";

type TocItem = {
  id: string;
  text: string;
  level: number;
};

type PostTocProps = {
  contentSelector?: string;
  title?: string;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function buildUniqueId(base: string, existing: Set<string>) {
  let id = base || "secao";
  let counter = 1;
  while (existing.has(id)) {
    counter += 1;
    id = `${base}-${counter}`;
  }
  existing.add(id);
  return id;
}

export function PostToc({ contentSelector = ".content", title = "Índice" }: PostTocProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const desktopListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const container = document.querySelector(contentSelector);
    if (!container) return;

    // Escanear apenas H2 e H3 conforme solicitado
    const headings = Array.from(container.querySelectorAll("h2, h3"));
    const existing = new Set<string>(headings.map((h) => h.id).filter(Boolean));
    const tocItems: TocItem[] = [];

    headings.forEach((heading) => {
      const level = Number(heading.tagName.replace("H", ""));
      const text = heading.textContent?.trim() ?? "";
      if (!text) return;

      if (!heading.id) {
        const base = slugify(text);
        heading.id = buildUniqueId(base, existing);
      }
      tocItems.push({ id: heading.id, text, level });
    });

    setItems(tocItems);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -80% 0px", threshold: 0.1 }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [contentSelector]);

  useEffect(() => {
    if (!mounted) return;
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px 0px 80px 0px",
      }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, [mounted]);

  useEffect(() => {
    if (isFooterVisible && isOpen) {
      setIsOpen(false);
    }
  }, [isFooterVisible, isOpen]);

  const hasItems = items.length > 0;
  const desktopItems = useMemo(() => items, [items]);

  useEffect(() => {
    const content = document.querySelector(contentSelector) as HTMLElement | null;
    if (!content) return;

    let rafId = 0;

    const syncScroll = () => {
      rafId = 0;
      const list = desktopListRef.current;
      if (!list) return;

      const listMax = list.scrollHeight - list.clientHeight;
      if (listMax <= 0) return;

      const contentTop = content.getBoundingClientRect().top + window.scrollY;
      const start = Math.max(0, contentTop - 24);
      const end = Math.max(start + 1, contentTop + content.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));

      list.scrollTop = listMax * progress;
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(syncScroll);
    };

    syncScroll();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [contentSelector, items.length]);

  if (!hasItems) return null;

  return (
    <>
      {/* Mobile: Floating Drawer Trigger (Gaveta Lateral) via Portal */}
      {mounted && createPortal(
        <div className="md:hidden">
          {/* Trigger Button - Always visible fixed tab */}
          <button
            onClick={() => setIsOpen(true)}
            className={`fixed left-0 top-1/2 z-[100] flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-r-lg border border-l-0 border-(--border) bg-white/95 py-3.5 pl-1 pr-1.5 shadow-[2px_0_8px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-all duration-300 ${isFooterVisible ? "pointer-events-none -translate-x-full opacity-0" : isOpen ? "-translate-x-full opacity-100" : "translate-x-0 opacity-100"}`}
            aria-label="Abrir Índice"
          >
            <ChevronRight size={16} className="text-(--brand-accent)" />
            <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-(--muted-2)" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
              Índice
            </span>
          </button>

          {/* Backdrop */}
          {isOpen && !isFooterVisible && (
            <div
              className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[2px] transition-opacity"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Drawer Panel - Compact & Vertically Centered */}
          <aside
            className={`fixed left-0 top-1/2 z-[101] flex max-h-[85vh] w-[286px] -translate-y-1/2 flex-col rounded-r-2xl border-y border-r border-(--border) bg-white shadow-2xl transition-transform duration-300 ${isOpen && !isFooterVisible ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-(--border) px-5 py-4">
              <div className="flex items-center gap-2">
                <List size={20} className="text-(--brand-accent)" />
                <span className="text-sm font-bold uppercase tracking-wide text-(--ink)">{title}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-(--muted-2) hover:bg-(--surface-muted) hover:text-(--brand-hot)"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="overflow-y-auto p-5">
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                    <a
                      href={`#${item.id}`}
                      className={`block w-full rounded-lg border px-4 py-3 text-sm font-medium leading-tight shadow-sm transition-all active:scale-[0.98] ${activeId === item.id
                        ? "border-(--brand-hot) bg-(--brand-primary)/5 text-(--brand-hot) ring-1 ring-(--brand-hot)"
                        : "border-(--border) bg-white text-(--ink) hover:border-(--brand-accent) hover:text-(--brand-accent)"
                        }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>,
        document.body
      )}

      {/* Desktop: Sticky Sidebar */}
      <aside className="sticky top-3 hidden h-fit w-full max-w-[232px] self-start md:block">
        <div className="brand-card max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl px-4 py-4">
          <div className="mb-3 flex items-center gap-2 border-b border-(--border) pb-2.5">
            <List size={16} className="text-(--brand-accent)" />
            <span className="text-xs font-bold uppercase tracking-wide text-(--muted-2)">{title}</span>
          </div>
          <nav
            ref={desktopListRef}
            className="toc-scroll max-h-[calc(100dvh-8rem)] overflow-y-auto pr-0"
          >
            <ul className="space-y-3 text-[13px] leading-snug text-(--muted)">
              {desktopItems.map((item) => (
                <li key={item.id} className={`transition-colors duration-200 ${item.level === 3 ? "pl-2 border-l-2 border-(--border-strong)" : ""}`}>
                  <a
                    href={`#${item.id}`}
                    className={`block break-words py-0.5 ${activeId === item.id
                      ? "font-semibold text-(--brand-hot) pl-0.5 -ml-0.5 border-l-2 border-(--brand-hot)"
                      : "hover:text-(--brand-hot) hover:translate-x-1 transition-transform"}`}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}

