"use client";
import { SITE_DOMAIN } from "@/lib/site";

import { CheckCircle2, ExternalLink, Globe2, Image as ImageIcon, SearchCheck, Share2 } from "lucide-react";
import type { ImageAsset } from "@/components/editor/types";

type SeoPreviewDeckProps = {
  title: string;
  description: string;
  previewPublicPath: string;
  previewInternalPath: string;
  heroImageUrl: string;
  heroImageAlt: string;
  ogImageUrl: string;
  images: ImageAsset[];
};

function resolveImageAsset(images: ImageAsset[], url: string) {
  if (!url) return null;
  return images.find((image) => image.url === url) ?? null;
}

function PreviewImage({
  src,
  alt,
  className,
  emptyLabel,
}: {
  src: string;
  alt: string;
  className?: string;
  emptyLabel: string;
}) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-(--surface-muted) text-[11px] font-medium text-(--text) ${className ?? ""}`}>
        {emptyLabel}
      </div>
    );
  }

  return <img src={src} alt={alt || "Preview"} className={className} />;
}

export function SeoPreviewDeck({
  title,
  description,
  previewPublicPath,
  previewInternalPath,
  heroImageUrl,
  heroImageAlt,
  ogImageUrl,
  images,
}: SeoPreviewDeckProps) {
  const socialImageUrl = ogImageUrl || heroImageUrl;
  const socialImageAlt = heroImageAlt || title || "Imagem social";
  const heroAsset = resolveImageAsset(images, heroImageUrl);
  const socialAsset = resolveImageAsset(images, socialImageUrl);
  const titleValue = title || "Título do post";
  const descriptionValue = description || "Resumo que vai ajudar o clique sem prometer o que a página não entrega.";
  const publicUrlLabel = previewPublicPath ? `${SITE_DOMAIN}${previewPublicPath}` : `${SITE_DOMAIN}/silo/slug`;
  const googleImageReady =
    Boolean(heroImageUrl) &&
    Boolean(heroImageAlt.trim()) &&
    Boolean(socialImageUrl) &&
    (heroAsset ? (heroAsset.width ?? 0) >= 1200 && (heroAsset.height ?? 0) >= 630 : true);

  const checks = [
    { label: "Título e descrição preenchidos", ok: Boolean(title.trim()) && Boolean(description.trim()) },
    { label: "Imagem de capa definida", ok: Boolean(heroImageUrl) },
    { label: "Alt da capa preenchido", ok: Boolean(heroImageAlt.trim()) },
    { label: "Open Graph/Twitter com imagem", ok: Boolean(socialImageUrl) },
    { label: "Robots com large image preview", ok: true },
    {
      label: heroAsset ? `Capa com pelo menos 1200x630 (${heroAsset.width ?? 0}x${heroAsset.height ?? 0})` : "Capa grande o suficiente",
      ok: heroAsset ? (heroAsset.width ?? 0) >= 1200 && (heroAsset.height ?? 0) >= 630 : Boolean(heroImageUrl),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        <section className="admin-subpane overflow-hidden p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--muted)">
              <SearchCheck size={13} />
              Google
            </p>
            <button
              type="button"
              onClick={() => {
                if (!previewInternalPath) return;
                window.open(previewInternalPath, "_blank", "noopener,noreferrer");
              }}
              disabled={!previewInternalPath}
              className={previewInternalPath ? "admin-button-soft" : "admin-button-soft opacity-55"}
            >
              Abrir preview
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-(--border-strong) bg-(--surface) p-3 shadow-[0_12px_28px_-22px_rgba(0,0,0,0.42)]">
            <div className="flex gap-3">
              <PreviewImage
                src={heroImageUrl}
                alt={socialImageAlt}
                className="h-20 w-20 rounded-xl border border-(--border) object-cover"
                emptyLabel="Sem capa"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-(--muted)">{publicUrlLabel}</p>
                <p className="mt-1 line-clamp-2 text-[20px] leading-tight text-(--brand-primary)">{titleValue}</p>
                <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-(--text)">{descriptionValue}</p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-(--muted)">
            Google decide sozinho se a imagem será exibida no resultado. O painel já marca os sinais tecnicos que ajudam
            a habilitar esse destaque.
          </p>
        </section>

        <section className="admin-subpane overflow-hidden p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--muted)">
              <Share2 size={13} />
              Open Graph / Twitter
            </p>
            <button
              type="button"
              onClick={() => {
                if (!previewPublicPath) return;
                window.open(previewPublicPath, "_blank", "noopener,noreferrer");
              }}
              disabled={!previewPublicPath}
              className={previewPublicPath ? "admin-button-ghost" : "admin-button-ghost opacity-55"}
            >
              Abrir URL
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-[22px] border border-(--border-strong) bg-(--surface) shadow-[0_14px_30px_-24px_rgba(0,0,0,0.44)]">
            <PreviewImage
              src={socialImageUrl}
              alt={socialImageAlt}
              className="h-44 w-full object-cover"
              emptyLabel="Sem imagem social"
            />
            <div className="space-y-1 p-3">
              <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-(--muted)">
                <Globe2 size={12} />
                {SITE_DOMAIN}
              </p>
              <p className="line-clamp-2 text-sm font-semibold text-(--h3-title)">{titleValue}</p>
              <p className="line-clamp-3 text-[12px] text-(--text)">{descriptionValue}</p>
              <p className="pt-1 text-[11px] text-(--muted)">
                {ogImageUrl ? "Usando uma imagem OG dedicada." : heroImageUrl ? "Usando a capa como imagem social." : "Defina uma imagem para a carta social."}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-subpane p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--muted)">
            <ImageIcon size={13} />
            Elegibilidade de capa
          </p>
          <span className={googleImageReady ? "admin-badge admin-badge-positive" : "admin-badge admin-badge-warning"}>
            {googleImageReady ? "Pronta" : "Ajustar"}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {checks.map((item) => (
            <div key={item.label} className="flex items-start gap-2 rounded-2xl border border-[rgba(58,88,95,0.95)] bg-[rgba(68,68,68,0.94)] px-3 py-2">
              <CheckCircle2
                size={14}
                className={item.ok ? "mt-0.5 shrink-0 text-(--admin-positive)" : "mt-0.5 shrink-0 text-(--admin-warning)"}
              />
              <span className={item.ok ? "text-[12px] text-(--text)" : "text-[12px] text-[rgba(207,219,225,0.92)]"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {socialAsset ? (
          <p className="mt-3 text-[11px] text-(--muted)">
            Imagem social detectada: {(socialAsset.width ?? 0) > 0 ? `${socialAsset.width}x${socialAsset.height ?? 0}px` : "dimensoes não registradas"}.
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {previewInternalPath ? (
            <button
              type="button"
              onClick={() => window.open(previewInternalPath, "_blank", "noopener,noreferrer")}
              className="admin-button-soft"
            >
              Ver página
              <ExternalLink size={12} />
            </button>
          ) : null}
          {previewPublicPath ? (
            <button
              type="button"
              onClick={() => window.open(previewPublicPath, "_blank", "noopener,noreferrer")}
              className="admin-button-ghost"
            >
              URL pública
              <ExternalLink size={12} />
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
