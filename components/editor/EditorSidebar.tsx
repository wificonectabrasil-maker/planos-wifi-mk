"use client";

import { useMemo, useRef, type DragEvent } from "react";
import { Calendar, Image as ImageIcon, Upload, User } from "lucide-react";
import { EDITOR_AUTHOR_OPTIONS } from "@/lib/site/collaborators";

export type EditorMeta = {
  title: string;
  seoTitle: string;
  slug: string;
  focusKeyword: string;
  metaDescription: string;
  coverImage: string;
  published: boolean;
  author: string;
  publicationDate: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getFirstParagraph(html: string) {
  const match = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (!match) return "";
  return match[1].replace(/<[^>]+>/g, "").trim();
}

export function EditorSidebar(props: {
  meta: EditorMeta;
  supportingRaw: string;
  contentHtml: string;
  contentText: string;
  open: boolean;
  authorOptions?: string[];
  onClose?: () => void;
  onSlugChange: (value: string) => void;
  onSeoTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onFocusKeywordChange: (value: string) => void;
  onCoverImageChange: (value: string) => void;
  onSupportingChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onPublicationDateChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const seoTitleCount = props.meta.seoTitle.length;
  const seoTitleOk = seoTitleCount >= 30 && seoTitleCount <= 60;

  const metaCount = props.meta.metaDescription.length;
  const metaOk = metaCount >= 120 && metaCount <= 160;

  const density = useMemo(() => {
    if (!props.meta.focusKeyword.trim()) return 0;
    const wordList = props.contentText.trim().split(/\s+/).filter(Boolean);
    if (!wordList.length) return 0;
    const escaped = props.meta.focusKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const matches = props.contentText.match(regex);
    return (matches ? matches.length : 0) / wordList.length * 100;
  }, [props.contentText, props.meta.focusKeyword]);

  const densityOk = density >= 0.5 && density <= 2.0;

  const score = useMemo(() => {
    if (!props.meta.focusKeyword.trim()) return 0;
    const keyword = normalize(props.meta.focusKeyword);
    const inTitle = normalize(props.meta.title).includes(keyword);
    const inSlug = props.meta.slug.includes(slugify(props.meta.focusKeyword));
    const firstParagraph = getFirstParagraph(props.contentHtml);
    const inFirst = normalize(firstParagraph).includes(keyword);
    return (inTitle ? 40 : 0) + (inFirst ? 40 : 0) + (inSlug ? 20 : 0);
  }, [props.contentHtml, props.meta.focusKeyword, props.meta.slug, props.meta.title]);

  const keywordReady = props.meta.focusKeyword.trim().length > 0;
  const inTitle = keywordReady && normalize(props.meta.title).includes(normalize(props.meta.focusKeyword));
  const inSlug = keywordReady && props.meta.slug.includes(slugify(props.meta.focusKeyword));
  const inFirst = keywordReady && normalize(getFirstParagraph(props.contentHtml)).includes(normalize(props.meta.focusKeyword));

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) props.onCoverImageChange(result);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFile(file);
    }
  }

  const authors = props.authorOptions ?? EDITOR_AUTHOR_OPTIONS;

  return (
    <aside
      className={`${props.open ? "flex" : "hidden"} fixed inset-y-0 right-0 z-40 h-screen w-80 flex-col gap-6 overflow-y-auto border-l border-(--border) bg-(--surface) px-6 py-8 xl:static xl:h-auto xl:border-l`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-(--muted)">Configurações</p>
          <p className="mt-1 text-sm font-semibold text-(--text)">Post e SEO</p>
        </div>

        {props.onClose ? (
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full border border-(--border) px-2 py-1 text-[10px] font-semibold text-(--muted) hover:bg-(--surface-muted) xl:hidden"
          >
            Fechar
          </button>
        ) : null}
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Post</p>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Slug</label>
            <input
              value={props.meta.slug}
              onChange={(e) => props.onSlugChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--muted)"
              placeholder="slug-do-artigo"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Imagem de capa</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--border) bg-(--surface-muted) px-4 py-6 text-center"
              onClick={() => fileInputRef.current?.click()}
            >
              {props.meta.coverImage ? (
                <img
                  src={props.meta.coverImage}
                  alt="Imagem de capa"
                  className="h-32 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="rounded-full bg-(--surface) p-2 text-(--muted)">
                    <Upload size={16} />
                  </span>
                  <span className="text-[11px] text-(--muted)">Arraste ou clique para enviar</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <div className="mt-2 flex items-center gap-2">
              <ImageIcon size={14} className="text-(--muted)" />
              <input
                value={props.meta.coverImage}
                onChange={(e) => props.onCoverImageChange(e.target.value)}
                placeholder="Ou cole a URL"
                className="w-full rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-1 text-[11px] text-(--text) outline-none focus:border-(--muted)"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Data de publicação</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2">
              <Calendar size={14} className="text-(--muted)" />
              <input
                type="datetime-local"
                value={props.meta.publicationDate}
                onChange={(e) => props.onPublicationDateChange(e.target.value)}
                className="w-full bg-transparent text-xs text-(--text) outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Autor</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2">
              <User size={14} className="text-(--muted)" />
              <select
                value={props.meta.author}
                onChange={(e) => props.onAuthorChange(e.target.value)}
                className="w-full bg-transparent text-xs text-(--text) outline-none"
              >
                {authors.map((author) => (
                  <option key={author} value={author}>
                    {author}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">SEO (KGR)</p>

          <div className="rounded-2xl border border-(--border) bg-(--surface) p-4">
            <p className="text-xs text-(--muted)">Score</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-semibold text-(--text)">{score}</span>
              <span className="text-xs text-(--muted)">/100</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-(--surface-muted)">
              <div
                className="h-2 rounded-full bg-(--brand-accent)"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-(--muted)">
              <p className={inTitle ? "text-(--admin-positive)" : "text-(--muted)"}>Keyword no H1</p>
              <p className={inFirst ? "text-(--admin-positive)" : "text-(--muted)"}>Keyword no primeiro parágrafo</p>
              <p className={inSlug ? "text-(--admin-positive)" : "text-(--muted)"}>Keyword no slug</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Palavra-chave</label>
            <input
              value={props.meta.focusKeyword}
              onChange={(e) => props.onFocusKeywordChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--muted)"
              placeholder="KGR principal"
            />
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-(--muted)">Densidade</span>
              <span className={`font-semibold ${densityOk ? "text-(--admin-positive)" : "text-amber-600"}`}>
                {density.toFixed(1)}%
              </span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Título SEO</label>
            <input
              value={props.meta.seoTitle}
              onChange={(e) => props.onSeoTitleChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--muted)"
              placeholder="Título que aparece na busca"
            />
            <p className={`mt-1 text-[10px] ${seoTitleOk ? "text-(--admin-positive)" : "text-rose-600"}`}>
              {seoTitleCount}/60
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Descrição meta</label>
            <textarea
              value={props.meta.metaDescription}
              onChange={(e) => props.onMetaDescriptionChange(e.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--muted)"
              placeholder="Resumo para o Google"
            />
            <p className={`mt-1 text-[10px] ${metaOk ? "text-(--admin-positive)" : "text-rose-600"}`}>
              {metaCount}/160
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">Palavras de apoio</label>
            <textarea
              value={props.supportingRaw}
              onChange={(e) => props.onSupportingChange(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--muted)"
              placeholder="Uma por linha"
            />
          </div>
        </section>
      </div>
    </aside>
  );
}
