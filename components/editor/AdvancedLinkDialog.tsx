"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Link as LinkIcon, Search, X } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useEditorContext } from "@/components/editor/EditorContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

type LinkType = "internal" | "external" | "affiliate" | "about" | "mention";

type InternalResult = {
  id: string;
  title: string;
  slug: string;
  siloSlug: string;
};

type SiloPostItem = {
  id: string;
  title: string;
  slug: string;
  role?: "PILLAR" | "SUPPORT" | "AUX" | null;
  position?: number | null;
  siloSlug?: string | null;
};

function parseRel(rel?: string) {
  const parts = (rel ?? "").split(/\s+/).map((s) => s.trim()).filter(Boolean);
  return new Set(parts);
}

function currentSelection(editor: Editor | null) {
  if (!editor) return "";
  const { from, to } = editor.state.selection;
  if (from === to) return "";
  return editor.state.doc.textBetween(from, to, " ");
}

export function AdvancedLinkDialog({ open, onClose }: Props) {
  const { editor, meta } = useEditorContext();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [linkType, setLinkType] = useState<LinkType>("external");
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [nofollow, setNofollow] = useState(false);
  const [sponsored, setSponsored] = useState(false);
  const [aboutEntity, setAboutEntity] = useState(false);
  const [mentionEntity, setMentionEntity] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [internalScope, setInternalScope] = useState<"silo" | "site">("silo");
  const [siloPosts, setSiloPosts] = useState<SiloPostItem[]>([]);
  const [loadingSiloPosts, setLoadingSiloPosts] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<InternalResult[]>([]);
  const [searching, setSearching] = useState(false);

  const selectedText = useMemo(() => currentSelection(editor), [editor, open]);
  const isAmazon = useMemo(() => {
    const lower = url.toLowerCase();
    return lower.includes("amazon.") || lower.includes("amzn.to") || lower.includes("a.co");
  }, [url]);
  const isInternal = linkType === "internal";
  const isInternalSilo = isInternal && internalScope === "silo" && Boolean(meta.siloId);
  const isAffiliate = linkType === "affiliate" || isAmazon;
  const showRelationshipPanel = !isInternal && !isAffiliate;

  const filteredSiloPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const roleRank: Record<string, number> = { PILLAR: 0, SUPPORT: 1, AUX: 2, "": 3 };
    const sorted = [...siloPosts].sort((a, b) => {
      const roleA = roleRank[a.role ?? ""] ?? 3;
      const roleB = roleRank[b.role ?? ""] ?? 3;
      if (roleA !== roleB) return roleA - roleB;
      const posA = typeof a.position === "number" ? a.position : 999;
      const posB = typeof b.position === "number" ? b.position : 999;
      if (posA !== posB) return posA - posB;
      return a.title.localeCompare(b.title);
    });
    if (!term) return sorted;
    return sorted.filter((item) =>
      item.title.toLowerCase().includes(term) || item.slug.toLowerCase().includes(term)
    );
  }, [siloPosts, search]);

  const staticPages = useMemo(
    () => [
      { title: "Sobre", href: "/sobre" },
      { title: "Contato", href: "/contato" },
    ],
    []
  );

  useEffect(() => {
    if (!open || !editor) return;
    const attrs = editor.getAttributes("link") as any;
    const rel = parseRel(attrs.rel);
    const href = attrs.href ?? "";
    const type = (attrs["data-link-type"] as LinkType | undefined) ?? "";
    const entity = attrs["data-entity"] ?? attrs["data-entity-type"];

    setUrl(href);
    setText(selectedText);
    setOpenInNewTab(attrs.target === "_blank");
    setNofollow(rel.has("nofollow"));
    setSponsored(rel.has("sponsored"));
    setAboutEntity(rel.has("about") || entity === "about");
    setMentionEntity(rel.has("mention") || entity === "mention");
    setPostId(attrs["data-post-id"] ?? null);

    if (type) {
      setLinkType(type);
      if (type === "internal") setInternalScope("silo");
    } else if (entity === "about" || rel.has("about")) {
      setLinkType("about");
    } else if (entity === "mention" || rel.has("mention")) {
      setLinkType("mention");
    } else if (rel.has("sponsored")) {
      setLinkType("affiliate");
    } else if (href.startsWith("/")) {
      setLinkType("internal");
      setInternalScope("silo");
    } else {
      setLinkType("external");
    }
  }, [editor, open, selectedText]);

  useEffect(() => {
    if (!open) return;
    if (isAmazon && linkType !== "affiliate") {
      setLinkType("affiliate");
      setSponsored(true);
      setNofollow(true);
      setOpenInNewTab(true);
      setAboutEntity(false);
      setMentionEntity(false);
    }
  }, [isAmazon, linkType, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isInternal || internalScope !== "site") return;
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetch(`/api/admin/mentions?q=${encodeURIComponent(term)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setResults((data.items ?? []) as InternalResult[]);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, search, isInternal, internalScope]);

  useEffect(() => {
    if (!open || !isInternal || internalScope !== "silo" || !meta.siloId) return;
    let cancelled = false;
    setLoadingSiloPosts(true);
    fetch(`/api/admin/silo-posts?siloId=${meta.siloId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSiloPosts(Array.isArray(data?.items) ? (data.items as SiloPostItem[]) : []);
      })
      .catch(() => {
        if (!cancelled) setSiloPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSiloPosts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isInternal, internalScope, meta.siloId]);

  function handleTypeChange(next: LinkType) {
    setLinkType(next);
    if (next === "affiliate") {
      setSponsored(true);
      setNofollow(true);
      setOpenInNewTab(true);
      setAboutEntity(false);
      setMentionEntity(false);
    }
    if (next === "external") {
      setOpenInNewTab(true);
    }
    if (next === "internal") {
      setOpenInNewTab(false);
      setNofollow(false);
      setSponsored(false);
      setAboutEntity(false);
      setMentionEntity(false);
      setInternalScope("silo");
    }
    if (next === "about") {
      setUrl("/sobre");
      setAboutEntity(true);
      setMentionEntity(false);
    }
    if (next === "mention") {
      setMentionEntity(true);
      setAboutEntity(false);
      setOpenInNewTab(false);
    }
  }

  function applyLinkDirect(options: {
    href: string;
    displayText: string;
    nextLinkType: LinkType;
    forceInternalSilo?: boolean;
    nextPostId?: string | null;
  }) {
    if (!editor) return;

    const href = options.href.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
      onClose();
      return;
    }

    const forceInternal = options.nextLinkType === "internal" || Boolean(options.forceInternalSilo);
    const isAmazonTarget = /amazon\.|amzn\.to|a\.co/i.test(href);
    const effectiveLinkType = isAmazonTarget ? "affiliate" : options.nextLinkType;
    const forceAffiliate = effectiveLinkType === "affiliate";
    const effectiveOpenInNewTab = forceInternal ? false : forceAffiliate ? true : openInNewTab;
    const effectiveNofollow = forceInternal ? false : forceAffiliate ? true : nofollow;
    const effectiveSponsored = forceInternal ? false : forceAffiliate ? true : sponsored;
    const effectiveAbout = forceInternal || forceAffiliate ? false : aboutEntity || effectiveLinkType === "about";
    const effectiveMention = forceInternal || forceAffiliate ? false : mentionEntity || effectiveLinkType === "mention";

    const relTokens = new Set<string>();
    if (effectiveNofollow) relTokens.add("nofollow");
    if (effectiveSponsored) relTokens.add("sponsored");
    if (effectiveAbout) relTokens.add("about");
    if (effectiveMention) relTokens.add("mention");
    if (effectiveOpenInNewTab) {
      relTokens.add("noopener");
      relTokens.add("noreferrer");
    }

    const rel = Array.from(relTokens).join(" ") || null;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const displayText = options.displayText.trim() || selectedText || href;

    const attrs = {
      href,
      target: effectiveOpenInNewTab ? "_blank" : null,
      rel,
      "data-link-type": effectiveLinkType,
      "data-post-id":
        effectiveLinkType === "internal" || effectiveLinkType === "mention" ? options.nextPostId ?? null : null,
      "data-entity-type": effectiveAbout ? "about" : effectiveMention ? "mention" : null,
      "data-entity": effectiveAbout ? "about" : effectiveMention ? "mention" : null,
    };

    if (!hasSelection) {
      editor.chain().focus().insertContent(displayText).extendMarkRange("link").setLink(attrs).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, displayText)
        .setTextSelection({ from, to: from + displayText.length })
        .setLink(attrs)
        .run();
    }

    onClose();
  }

  function apply() {
    if (!editor) return;
    applyLinkDirect({
      href: url,
      displayText: text,
      nextLinkType: linkType,
      forceInternalSilo: isInternal,
      nextPostId: postId,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-(--border) bg-(--surface) shadow-2xl">
        <div className="flex items-center justify-between border-b border-(--border) px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-(--text)">
            <LinkIcon size={16} />
            Super Link
          </div>
          <button type="button" onClick={onClose} className="text-(--muted-2) hover:text-(--muted)">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div>
            <label className="text-xs font-semibold uppercase text-(--muted-2)">Tipo do link</label>
            <select
              value={linkType}
              onChange={(event) => handleTypeChange(event.target.value as LinkType)}
              className="admin-select mt-2"
            >
              <option value="internal">Interno</option>
              <option value="external">Externo</option>
              <option value="affiliate">Afiliado</option>
              <option value="about">About</option>
              <option value="mention">Mention</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {!isInternalSilo && (
              <div>
                <label className="text-xs font-semibold uppercase text-(--muted-2)">URL</label>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="admin-input mt-2"
                  placeholder="https://..."
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase text-(--muted-2)">Texto do link</label>
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="admin-input mt-2"
                placeholder={selectedText || "Texto visivel"}
              />
            </div>
          </div>

          {showRelationshipPanel && (
            <div className="rounded-md border border-(--border) bg-(--surface-muted) p-3">
              <p className="text-[11px] font-semibold uppercase text-(--muted-2)">Relacionamento</p>
              <div className="mt-3 space-y-3">
                <Toggle
                  label="Abrir em nova aba"
                  checked={openInNewTab}
                  onChange={setOpenInNewTab}
                  icon={<ExternalLink size={14} />}
                />
                <Toggle label="Nofollow (SEO)" checked={nofollow} onChange={setNofollow} />
                <Toggle
                  label="Sponsored (Afiliado)"
                  checked={sponsored}
                  onChange={setSponsored}
                  tone="accent"
                />
                <Toggle label="About (Entidade)" checked={aboutEntity} onChange={setAboutEntity} tone="purple" />
                <Toggle label="Mention (Entidade)" checked={mentionEntity} onChange={setMentionEntity} tone="blue" />
              </div>
            </div>
          )}

          {isInternal && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              Links internos sao sempre dofollow e indexaveis. Opções de relacionamento ficam ocultas.
            </div>
          )}

          {isAffiliate && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              <p className="text-[11px] font-semibold uppercase text-amber-700">Link afiliado</p>
              {isAmazon && (
                <p className="mt-1 text-[10px] text-amber-700">
                  Links Amazon sao sempre sponsored (padrão do projeto).
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Affiliate</span>
                {isAmazon && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Amazon</span>
                )}
                <span className="rounded-full bg-amber-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Sponsored</span>
                <span className="rounded-full bg-amber-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Nofollow</span>
                <span className="rounded-full bg-amber-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">_blank</span>
              </div>
            </div>
          )}

          {isInternal && (
            <div className="rounded-md border border-(--border) bg-(--surface) p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase text-(--muted-2)">Links internos</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInternalScope("silo")}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${internalScope === "silo" ? "border-(--brand-hot) bg-(--accent-soft) text-(--brand-hot)" : "border-(--border) bg-(--surface-muted) text-(--muted)"}`}
                  >
                    Paginas do silo
                  </button>
                  <button
                    type="button"
                    onClick={() => setInternalScope("site")}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${internalScope === "site" ? "border-(--brand-hot) bg-(--accent-soft) text-(--brand-hot)" : "border-(--border) bg-(--surface-muted) text-(--muted)"}`}
                  >
                    Outras paginas
                  </button>
                </div>
              </div>

              {staticPages.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase text-(--muted-2)">Atalhos</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {staticPages.map((page) => (
                      <button
                        key={page.href}
                        type="button"
                        onClick={() => {
                          applyLinkDirect({
                            href: page.href,
                            displayText: selectedText || page.title,
                            nextLinkType: "internal",
                            forceInternalSilo: true,
                          });
                        }}
                        className="rounded-md border border-(--border) px-3 py-2 text-left text-[11px] font-medium text-(--muted) hover:bg-(--surface-muted)"
                      >
                        <div className="font-semibold text-(--text)">{page.title}</div>
                        <div className="text-[10px] text-(--muted-2)">{page.href}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 rounded-md border border-(--border) bg-(--surface-muted) px-2 py-2">
                <Search size={14} className="text-(--muted-2)" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={internalScope === "silo" ? "Filtrar posts" : "Buscar por título"}
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>

              {internalScope === "silo" ? (
                loadingSiloPosts ? (
                  <p className="mt-2 text-xs text-(--muted-2)">Carregando posts do silo...</p>
                ) : filteredSiloPosts.length === 0 ? (
                  <p className="mt-2 text-xs text-(--muted-2)">Nenhum post encontrado.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {filteredSiloPosts.map((item) => {
                      const roleLabel = item.role === "PILLAR" ? "PILAR" : item.role === "SUPPORT" ? "SUPORTE" : item.role === "AUX" ? "APOIO" : "POST";
                      const roleColor = item.role === "PILLAR" ? "bg-orange-500" : item.role === "SUPPORT" ? "bg-yellow-500" : item.role === "AUX" ? "bg-blue-500" : "bg-gray-400";
                      const siloSlug = item.siloSlug || "";
                      const href = siloSlug ? `/${siloSlug}/${item.slug}` : `/${item.slug}`;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            applyLinkDirect({
                              href,
                              displayText: selectedText || item.title,
                              nextLinkType: "internal",
                              forceInternalSilo: true,
                              nextPostId: item.id,
                            });
                          }}
                          className="w-full rounded-md border border-(--border) px-3 py-2 text-left text-xs text-(--muted) hover:bg-(--surface-muted)"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase text-white ${roleColor}`}>{roleLabel}</span>
                            {typeof item.position === "number" && (
                              <span className="text-[10px] text-(--muted-2)">#{item.position}</span>
                            )}
                          </div>
                          <p className="mt-1 font-medium text-(--text)">{item.title}</p>
                          <p className="text-[10px] text-(--muted-2)">{href}</p>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : searching ? (
                <p className="mt-2 text-xs text-(--muted-2)">Buscando...</p>
              ) : results.length === 0 ? (
                <p className="mt-2 text-xs text-(--muted-2)">Nenhum resultado.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setUrl(`/${item.siloSlug}/${item.slug}`);
                        if (!selectedText) {
                          setText(item.title);
                        }
                        setPostId(item.id);
                        setLinkType("internal");
                        setOpenInNewTab(false);
                        setNofollow(false);
                      }}
                      className="w-full rounded-md border border-(--border) px-3 py-2 text-left text-xs text-(--muted) hover:bg-(--surface-muted)"
                    >
                      <p className="font-medium text-(--text)">{item.title}</p>
                      <p className="text-[10px] text-(--muted-2)">
                        /{item.siloSlug}/{item.slug}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-(--border) bg-(--surface-muted) px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-(--border) px-3 py-2 text-xs font-semibold text-(--muted) hover:bg-(--surface-muted)"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center gap-2 rounded-md bg-(--brand-hot) px-4 py-2 text-xs font-semibold text-(--paper) hover:bg-(--brand-accent)"
          >
            <Check size={14} />
            Aplicar link
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  icon,
  tone,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ReactNode;
  tone?: "accent" | "purple" | "blue";
  disabled?: boolean;
}) {
  const bgClass =
    tone === "accent"
      ? checked
        ? "bg-orange-600"
        : "bg-gray-300 dark:bg-gray-600"
      : tone === "purple"
        ? checked
          ? "bg-purple-600"
          : "bg-gray-300 dark:bg-gray-600"
        : tone === "blue"
          ? checked
            ? "bg-blue-600"
            : "bg-gray-300 dark:bg-gray-600"
          : checked
            ? "bg-emerald-600"
            : "bg-gray-300 dark:bg-gray-600";

  const textClass =
    tone === "accent"
      ? checked
        ? "text-orange-600 dark:text-orange-400 font-bold"
        : "text-gray-600 dark:text-gray-400"
      : tone === "purple"
        ? checked
          ? "text-purple-600 dark:text-purple-400 font-bold"
          : "text-gray-600 dark:text-gray-400"
        : tone === "blue"
          ? checked
            ? "text-blue-600 dark:text-blue-400 font-bold"
            : "text-gray-600 dark:text-gray-400"
          : checked
            ? "text-emerald-700 dark:text-emerald-400 font-bold"
            : "text-gray-600 dark:text-gray-400";

  return (
    <label className={`group flex items-center justify-between py-2 px-2 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <span className={`flex items-center gap-2 text-sm transition-colors ${textClass}`}>
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange(!checked);
        }}
        className={`relative h-6 w-11 rounded-full transition-all duration-200 flex items-center ${bgClass} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        disabled={disabled}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`}
        />
      </button>
    </label>
  );
}

