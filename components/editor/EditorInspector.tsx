"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { CalendarClock, CheckCircle2, Info, ShieldCheck, UserRound } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { EDITOR_AUTHOR_OPTIONS } from "@/lib/site/collaborators";
import { buildPostCanonicalPath, buildSiloCanonicalPath } from "@/lib/seo/canonical";
import { normalizeSlugInput } from "@/lib/slug";
import { ReviewPanel } from "@/components/editor/ReviewPanel";
import { SeoPreviewDeck } from "@/components/editor/SeoPreviewDeck";
import { SerpAnalysisPanel } from "@/components/serp/SerpAnalysisPanel";

type Tab = "post" | "seo" | "review" | "eeat" | "publish";

const AUTHORS = EDITOR_AUTHOR_OPTIONS;

type SiloOrganizationItem = {
  id: string;
  title: string;
  slug: string;
  role?: "PILLAR" | "SUPPORT" | "AUX" | null;
  position?: number | null;
  silo_group?: string | null;
  silo_order?: number | null;
  show_in_silo_menu?: boolean;
};

type SiloOrganizationSummary = {
  siloSlug?: string | null;
  siloName?: string | null;
  pillar?: SiloOrganizationItem | null;
  items?: SiloOrganizationItem[];
};

function counterTone(count: number, min: number, max: number) {
  if (count === 0) return "text-(--muted-2)";
  if (count < min || count > max) return "text-(--brand-hot)";
  return "text-(--h3-title)";
}

export function EditorInspector() {
  const {
    postId,
    meta,
    setMeta,
    slugStatus,
    silos,
    lastSavedAt,
    saving,
    onSave,
    createSilo,
    refreshSilos,
    onHeroUpload,
    onOpenHeroPicker,
    onOpenMedia,
    onInsertImage,
    onUpdateImageAlt,
  } = useEditorContext();
  const [tab, setTab] = useState<Tab>("post");
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [siloSummary, setSiloSummary] = useState<SiloOrganizationSummary | null>(null);
  const [loadingSiloSummary, setLoadingSiloSummary] = useState(false);
  const [siloSummaryError, setSiloSummaryError] = useState<string | null>(null);

  const seoTitleCount = meta.metaTitle.length;
  const seoDescCount = meta.metaDescription.length;
  const siloSlug = useMemo(() => {
    if (!meta.siloId) return "";
    return silos.find((silo) => silo.id === meta.siloId)?.slug ?? "";
  }, [meta.siloId, silos]);
  const previewInternalPath = useMemo(() => (postId ? `/admin/preview/${postId}` : ""), [postId]);
  const previewPublicPath = useMemo(() => {
    return buildPostCanonicalPath(siloSlug, meta.slug) ?? "";
  }, [meta.slug, siloSlug]);
  const currentSiloName = useMemo(() => {
    if (!meta.siloId) return "";
    return silos.find((silo) => silo.id === meta.siloId)?.name ?? "";
  }, [meta.siloId, silos]);
  const currentPillar = useMemo(() => {
    if (!siloSummary?.items?.length) return null;
    return siloSummary.items.find((item) => item.role === "PILLAR") ?? null;
  }, [siloSummary]);
  const isPillarRole = meta.siloRole === "PILLAR";
  const isAuxRole = meta.siloRole === "AUX";
  const siloHubPath = useMemo(() => {
    const slugFromSummary = siloSummary?.siloSlug ?? "";
    return buildSiloCanonicalPath(slugFromSummary || siloSlug) ?? "";
  }, [siloSlug, siloSummary?.siloSlug]);

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return "Sem salvamento";
    return `Salvo as ${lastSavedAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [lastSavedAt]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!meta.siloId) {
      setSiloSummary(null);
      setSiloSummaryError(null);
      setLoadingSiloSummary(false);
      return;
    }

    let cancelled = false;
    setLoadingSiloSummary(true);
    setSiloSummaryError(null);

    fetch(`/api/admin/silo-posts?siloId=${meta.siloId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar organização do silo.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSiloSummary((data ?? null) as SiloOrganizationSummary | null);
      })
      .catch((error: any) => {
        if (cancelled) return;
        const message = typeof error?.message === "string" ? error.message : "Falha ao carregar organização do silo.";
        setSiloSummaryError(message);
        setSiloSummary(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingSiloSummary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lastSavedAt, meta.siloId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCreateSilo = async () => {
    const name = window.prompt("Nome do silo");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await createSilo(trimmed);
    if (!created) return;
    await refreshSilos();
    setMeta({ siloId: created.id });
  };

  const handleHeroDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    onHeroUpload(file);
  };

  const handleRemoveHero = () => {
    if (!meta.heroImageUrl) return;
    const confirmed = window.confirm("Remover a imagem de capa deste post?");
    if (!confirmed) return;
    setMeta({ heroImageUrl: "", heroImageAlt: "" });
  };

  const handleLibraryAltChange = (url: string, alt: string) => {
    onUpdateImageAlt(url, alt);
    if (meta.heroImageUrl === url) {
      setMeta({ heroImageAlt: alt });
    }
  };

  const displayImages = meta.images ?? [];


  return (
    <aside className="admin-sidebar admin-sidebar-right flex h-full min-h-0 w-[424px] shrink-0 flex-col border-l border-(--border) xl:w-[464px]">
      <div className="admin-tab-strip">
        <TabButton label="Post" active={tab === "post"} onClick={() => setTab("post")} />
        <TabButton label="SEO / KGR" active={tab === "seo"} onClick={() => setTab("seo")} />
        <TabButton label="Revisão" active={tab === "review"} onClick={() => setTab("review")} />
        <TabButton label="E-E-A-T" active={tab === "eeat"} onClick={() => setTab("eeat")} />
        <TabButton label="Publicar" active={tab === "publish"} onClick={() => setTab("publish")} />
      </div>

      <div className="admin-scrollbar flex-1 space-y-2.5 overflow-y-auto px-3 py-2 text-xs text-(--text) md:px-3 md:py-2.5">
        {tab === "post" ? (
          <div className="space-y-4">
            <Field label="Título do post (H1)">
              <input
                value={meta.title}
                onChange={(event) => setMeta({ title: event.target.value })}
                placeholder="Novo post"
                className="admin-input"
              />
            </Field>

            <Field label="Imagem de capa">
              <div
                className="overflow-hidden rounded-md border border-dashed border-(--border) bg-(--surface-muted)"
                onDrop={handleHeroDrop}
                onDragOver={(event) => event.preventDefault()}
                onClick={onOpenHeroPicker}
              >
                {meta.heroImageUrl && !brokenImages[meta.heroImageUrl] ? (
                  <img
                    src={meta.heroImageUrl}
                    alt={meta.heroImageAlt || "Capa"}
                    className="h-36 w-full object-cover"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [meta.heroImageUrl]: true }))
                    }
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center px-3 text-center text-xs text-(--muted-2)">
                    Arraste ou clique para enviar a imagem de capa
                  </div>
                )}
              </div>
              <p className="mt-2 text-[10px] text-(--muted)">
                {meta.heroImageUrl ? "Clique na imagem para trocar." : "Use capa 16:9 em 1200x675 px."}
              </p>
              {meta.heroImageUrl ? (
                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleRemoveHero}
                    className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] font-semibold text-(--brand-hot) hover:border-(--brand-hot)"
                  >
                    Remover capa
                  </button>
                </div>
              ) : null}
            </Field>

            <Field label="Alt text da imagem de capa (obrigatório)">
              <input
                value={meta.heroImageAlt}
                onChange={(event) => setMeta({ heroImageAlt: event.target.value })}
                placeholder="Alt text da imagem de capa (obrigatório)"
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Lead / Introdução">
              <textarea
                rows={3}
                value={meta.metaDescription}
                onChange={(event) => setMeta({ metaDescription: event.target.value })}
                className="w-full resize-none rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
                placeholder="Resumo inicial do artigo"
              />
            </Field>

            <div className="admin-subpane p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-(--muted)">
                <span>Mídia do post</span>
                <button
                  type="button"
                  onClick={onOpenMedia}
                  className="rounded-md border border-(--border) bg-(--surface) px-2 py-1 text-[10px] text-(--text) hover:border-(--brand-hot) hover:text-(--brand-hot)"
                >
                  Inserir imagem no corpo
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {displayImages.length === 0 ? (
                  <p className="text-xs text-(--muted-2)">Nenhuma imagem enviada.</p>
                ) : (
                  displayImages.map((image) => {
                    const isHero = meta.heroImageUrl === image.url;
                    return (
                      <div
                        key={image.url}
                        className="flex items-start gap-3 rounded-md border border-(--border) bg-(--surface) p-2"
                      >
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-(--border) bg-(--surface-muted)">
                          {image.url && !brokenImages[image.url] ? (
                            <img
                              src={image.url}
                              alt={image.alt || "Imagem"}
                              className="h-full w-full object-cover"
                              onError={() => setBrokenImages((prev) => ({ ...prev, [image.url]: true }))}
                            />
                          ) : (
                            <span className="px-1 text-[9px] text-(--muted-2)">Sem preview</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              value={image.alt}
                              onChange={(event) => handleLibraryAltChange(image.url, event.target.value)}
                              placeholder="Alt text"
                              className="w-full rounded-md border border-(--border) bg-(--surface) px-2 py-1 text-[11px] outline-none"
                            />
                            {isHero ? (
                              <span className="rounded-full border border-[rgba(64,209,219,0.52)] bg-(--surface-muted) px-2 py-1 text-[9px] font-semibold text-(--brand-accent)">
                                Capa
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onInsertImage(image)}
                              className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] text-(--text) hover:border-(--brand-hot) hover:text-(--brand-hot)"
                            >
                              Inserir no texto
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
        {tab === "seo" ? (
          <div className="space-y-4">
            <Field
              label="Slug"
              helper={
                slugStatus === "checking"
                  ? "Checando..."
                  : slugStatus === "taken"
                    ? "Em uso"
                    : slugStatus === "ok"
                      ? "Disponivel"
                      : "Use minusculas, numeros, - ou _"
              }
            >
              <input
                value={meta.slug}
                onChange={(event) => setMeta({ slug: normalizeSlugInput(event.target.value) })}
                onPaste={(event) => {
                  event.preventDefault();
                  setMeta({ slug: normalizeSlugInput(event.clipboardData.getData("text")) });
                }}
                pattern="[a-z0-9]+([-_][a-z0-9]+)*"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Keyword principal">
              <input
                value={meta.targetKeyword}
                onChange={(event) => setMeta({ targetKeyword: event.target.value })}
                className="admin-input"
              />
            </Field>

            <Field label="Título SEO" helper={<span className={counterTone(seoTitleCount, 30, 60)}>{seoTitleCount}/60</span>}>
              <input
                value={meta.metaTitle}
                onChange={(event) => setMeta({ metaTitle: event.target.value })}
                className="admin-input"
              />
            </Field>

            <Field
              label="Meta description"
              helper={<span className={counterTone(seoDescCount, 150, 170)}>{seoDescCount}/170</span>}
            >
              <textarea
                rows={3}
                value={meta.metaDescription}
                onChange={(event) => setMeta({ metaDescription: event.target.value })}
                className="admin-textarea"
              />
            </Field>

            <Field label="Open Graph / Twitter image">
              <div className="space-y-2">
                <input
                  value={meta.ogImageUrl}
                  onChange={(event) => setMeta({ ogImageUrl: event.target.value })}
                  placeholder={meta.heroImageUrl ? "Vazio = usa a capa" : "Cole uma URL de imagem para redes"}
                  className="admin-input"
                />
                <div className="flex flex-wrap gap-2">
                  {meta.heroImageUrl ? (
                    <button
                      type="button"
                      onClick={() => setMeta({ ogImageUrl: meta.heroImageUrl })}
                      className="admin-button-soft"
                    >
                      Usar capa
                    </button>
                  ) : null}
                  {meta.ogImageUrl ? (
                    <button type="button" onClick={() => setMeta({ ogImageUrl: "" })} className="admin-button-ghost">
                      Limpar imagem OG
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>

            <Field label="Keywords complementares (1 por linha)">
              <textarea
                rows={3}
                value={meta.supportingKeywords.join("\n")}
                onChange={(event) =>
                  setMeta({ supportingKeywords: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })
                }
                className="admin-textarea"
              />
            </Field>

            <Field label="Entidades / LSI (1 por linha)">
              <textarea
                rows={3}
                value={meta.entities.join("\n")}
                onChange={(event) => setMeta({ entities: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })}
                className="admin-textarea"
              />
            </Field>

            <SeoPreviewDeck
              title={meta.metaTitle || meta.title}
              description={meta.metaDescription}
              previewPublicPath={previewPublicPath}
              previewInternalPath={previewInternalPath}
              heroImageUrl={meta.heroImageUrl}
              heroImageAlt={meta.heroImageAlt}
              ogImageUrl={meta.ogImageUrl}
              images={displayImages}
            />
          </div>
        ) : null}

        {tab === "review" ? (
          <div className="space-y-2.5">
            <ReviewPanel />
            <SerpAnalysisPanel
              defaultQuery={meta.targetKeyword || meta.title}
              intentSource={meta.title || meta.targetKeyword}
              title="Analise SERP do post"
            />
          </div>
        ) : null}

        {tab === "eeat" ? (
          <div className="space-y-4">
            <Field label="Autor">
              <select
                value={meta.authorName}
                onChange={(event) => setMeta({ authorName: event.target.value })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              >
                <option value="">Selecionar</option>
                {AUTHORS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Links sameAs (1 por linha)">
              <textarea
                rows={3}
                value={meta.authorLinks.join("\n")}
                onChange={(event) => setMeta({ authorLinks: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })}
                className="w-full resize-none rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
                placeholder="https://linkedin.com/..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Revisado por">
                <input
                  value={meta.reviewedBy}
                  onChange={(event) => setMeta({ reviewedBy: event.target.value })}
                  className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field label="Data da revisão">
                <input
                  type="datetime-local"
                  value={meta.reviewedAt}
                  onChange={(event) => setMeta({ reviewedAt: event.target.value })}
                  className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
                />
              </Field>
            </div>

            <div className="admin-subpane p-3 text-[11px] text-(--muted)">
              <p className="flex items-center gap-2 font-semibold uppercase text-(--muted)">
                <ShieldCheck size={12} /> Checklist
              </p>
              <Check label="Autor preenchido" ok={Boolean(meta.authorName)} />
              <Check label="Links sameAs" ok={meta.authorLinks.length > 0} />
              <Check label="Revisão preenchida" ok={Boolean(meta.reviewedAt)} />
            </div>
          </div>
        ) : null}

        {tab === "publish" ? (
          <div className="space-y-4">
            <div className="rounded-md border border-[rgba(167,157,77,0.55)] bg-(--surface) p-3 text-[11px] text-(--text)">
              Confira a aba <strong>Revisão</strong> antes de publicar para validar plágio externo, duplicação interna e schema.
            </div>

            <Field label="Status">
              <select
                value={meta.status}
                onChange={(event) => setMeta({ status: event.target.value as typeof meta.status })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              >
                <option value="draft">Rascunho</option>
                <option value="review">Revisão</option>
                <option value="published">Publicado</option>
              </select>
            </Field>

            <div className="rounded-lg border border-(--border-strong) bg-(--surface) p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase text-(--text)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    <path d="m13 13 6 6" />
                  </svg>
                  Organização
                </p>
                <button
                  type="button"
                  onClick={() => void handleCreateSilo()}
                  className="flex h-6 w-6 items-center justify-center rounded border border-(--border-strong) text-xs text-(--text) hover:border-(--brand-hot) hover:text-(--brand-hot)"
                  title="Criar silo"
                >
                  +
                </button>
              </div>

              <Field label="Silo (obrigatório)">
                <select
                  value={meta.siloId}
                  onChange={(event) =>
                    setMeta({
                      siloId: event.target.value,
                      replaceExistingPillar: false,
                    })
                  }
                  className="admin-select"
                >
                  <option value="">Selecione um silo</option>
                  {silos.map((silo) => (
                    <option key={silo.id} value={silo.id}>
                      {silo.name}
                    </option>
                  ))}
                </select>
              </Field>

              {!meta.siloId ? (
                <p className="mt-3 rounded-md border border-(--border-strong) bg-(--surface-muted) px-3 py-2 text-[11px] text-(--text)">
                  Selecione um silo para definir papel, grupo e ordem.
                </p>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Papel no silo">
                      <select
                        value={meta.siloRole ?? "SUPPORT"}
                        onChange={(event) => {
                          const nextRole = event.target.value as "PILLAR" | "SUPPORT" | "AUX";
                          const isNextPillar = nextRole === "PILLAR";
                          const isNextAux = nextRole === "AUX";
                          setMeta({
                            siloRole: nextRole,
                            siloPosition: isNextPillar ? undefined : meta.siloPosition,
                            siloOrder: isNextPillar || isNextAux ? 0 : meta.siloOrder ?? 0,
                            showInSiloMenu: isNextPillar ? true : isNextAux ? false : meta.showInSiloMenu ?? true,
                            replaceExistingPillar: false,
                          });
                        }}
                        className="admin-select"
                      >
                        <option value="PILLAR">Pilar</option>
                        <option value="SUPPORT">Suporte</option>
                        <option value="AUX">Apoio</option>
                      </select>
                    </Field>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Número do post">
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={isPillarRole ? 1 : meta.siloPosition ?? ""}
                        disabled={isPillarRole}
                        onChange={(event) => {
                          const raw = event.target.value.trim();
                          const parsed = Number.parseInt(raw, 10);
                          setMeta({
                            siloPosition: Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined,
                          });
                        }}
                        className="admin-input"
                      />
                    </Field>

                    <Field label="Ordem">
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={isAuxRole ? 0 : meta.siloOrder ?? 0}
                        disabled={isPillarRole || isAuxRole}
                        onChange={(event) => {
                          const nextOrder = Math.max(0, parseInt(event.target.value, 10) || 0);
                          setMeta({
                            siloOrder: nextOrder,
                          });
                        }}
                        className="admin-input"
                      />
                    </Field>
                  </div>

                  <p className="mt-2 text-[10px] text-(--muted-2)">
                    Número do post e ordem são campos diferentes.
                  </p>

                  <div className="mt-3">
                    <Field label="Mostrar no hub do silo">
                      <div className="rounded-md border border-(--border-strong) bg-(--surface-muted) px-3 py-[10px]">
                        <label className="flex items-center gap-2 text-[12px] font-medium text-(--text)">
                          <input
                            type="checkbox"
                            checked={isPillarRole ? true : isAuxRole ? false : meta.showInSiloMenu ?? true}
                            disabled={isPillarRole || isAuxRole}
                            onChange={(event) => setMeta({ showInSiloMenu: event.target.checked })}
                            className="h-4 w-4 rounded border-(--border-strong)"
                          />
                          Incluir na navegação da hub
                        </label>
                      </div>
                    </Field>
                  </div>

                  {isPillarRole ? (
                    <p className="mt-2 text-[10px] text-(--muted)">
                      Pilar é a página principal do silo. Não usa ordem.
                    </p>
                  ) : null}

                  {isPillarRole && currentPillar && postId && currentPillar.id !== postId ? (
                    <p className="mt-1 text-[10px] text-(--admin-warning)">
                      Já existe outro pilar neste silo. Ao salvar, você poderá confirmar a substituição em um modal.
                    </p>
                  ) : null}

                  {isAuxRole ? (
                    <p className="mt-2 text-[10px] text-(--muted)">
                      Posts de apoio ficam ocultos da navegação principal da hub e não usam ordem.
                    </p>
                  ) : null}

                  <div className="mt-3 rounded-md border border-(--border-strong) bg-(--surface-muted) p-3">
                    <p className="text-[11px] font-semibold uppercase text-(--text)">Resumo do silo</p>
                    {currentSiloName ? <p className="mt-1 text-[11px] text-(--muted)">Silo: {currentSiloName}</p> : null}
                    {loadingSiloSummary ? (
                      <p className="mt-2 text-[11px] text-(--muted-2)">Carregando organização...</p>
                    ) : siloSummaryError ? (
                      <p className="mt-2 text-[11px] text-(--admin-danger)">{siloSummaryError}</p>
                    ) : (
                      <>
                        <p className="mt-2 text-[11px] text-(--text)">
                          Pilar atual: <strong>{currentPillar?.title ?? "Nenhum pilar definido"}</strong>
                        </p>
                        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-md border border-(--border) bg-(--surface) p-2">
                          {(siloSummary?.items ?? []).length === 0 ? (
                            <p className="text-[11px] text-(--muted-2)">Sem posts vinculados neste silo.</p>
                          ) : (
                            (siloSummary?.items ?? []).map((item) => {
                              return (
                                <div key={item.id} className="rounded border border-(--border) bg-(--surface) px-2 py-1">
                                  <p className="truncate text-[11px] font-semibold text-(--text)">{item.title}</p>
                                  <p className="text-[10px] text-(--muted)">
                                    {(item.role ?? "SUPPORT")}
                                    {typeof item.position === "number" ? ` #${item.position}` : ""} | ordem{" "}
                                    {item.silo_order ?? 0}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                        {siloHubPath ? (
                          <button
                            type="button"
                            onClick={() => window.open(siloHubPath, "_blank", "noopener,noreferrer")}
                            className="mt-2 rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] font-semibold text-(--text) hover:border-(--brand-hot) hover:text-(--brand-hot)"
                          >
                            Abrir hub do silo
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <Field label="Agendamento (opcional)">
              <input
                type="datetime-local"
                value={meta.scheduledAt}
                onChange={(event) => setMeta({ scheduledAt: event.target.value })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Canonical">
              <input
                value={meta.canonicalPath}
                onChange={(event) => setMeta({ canonicalPath: event.target.value })}
                placeholder="/silo/slug"
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="rounded-md border border-(--border) bg-(--surface) p-3 text-[11px] text-(--muted)">
              <p className="flex items-center gap-2 font-semibold uppercase text-(--muted)">
                <Info size={12} /> Status
              </p>
              <p className="mt-2 flex items-center gap-2 text-(--muted)">
                <CalendarClock size={12} />
                {saving ? "Salvando..." : lastSavedLabel}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onSave()}
                  className="admin-button-soft px-3 py-2 text-[12px]"
                >
                  Salvar rascunho
                </button>
                <button
                  type="button"
                  onClick={() => void onSave("published")}
                  className="admin-button-primary px-3 py-2 text-[12px]"
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Field({ label, helper, children }: { label: React.ReactNode; helper?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.05em] text-(--muted)">
        <div className="flex items-center gap-2">{label}</div>
        {helper}
      </div>
      {children}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`admin-tab flex-1 ${active ? "is-active" : ""}`}
    >
      {label}
    </button>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {ok ? <CheckCircle2 size={12} className="text-(--h3-title)" /> : <UserRound size={12} className="text-(--muted-2)" />}
      <span className={ok ? "text-(--text)" : "text-(--muted-2)"}>{label}</span>
    </div>
  );
}
