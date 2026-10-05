"use client";

import { useMemo } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { Shield, Image as ImageIcon, FileCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Editor } from "@tiptap/react";

type SchemaScore = {
    hasSchema: boolean;
    schemaType: string;
    missingFields: string[];
    suggestions: string[];
    score: number; // 0-100
};

type ImageScore = {
    total: number;
    withAlt: number;
    withoutAlt: number;
    hasHero: boolean;
    hasHeroAlt: boolean;
    hasOgOrHero: boolean;
    bodyImages: number;
    visualPlaceholders: number;
    issues: string[];
    score: number; // 0-100
};

type EEATScore = {
    hasAuthor: boolean;
    hasExpert: boolean;
    hasReviewer: boolean;
    hasSources: boolean;
    isSensitive: boolean;
    score: number; // 0-100
    issues: string[];
};

function detectFAQInContent(editor: Editor | null): boolean {
    if (!editor) return false;
    const text = editor.getText().toLowerCase();
    return text.includes("perguntas frequentes") ||
        text.includes("faq") ||
        text.includes("dúvidas frequentes");
}

export function QualityPanel() {
    const { meta, editor } = useEditorContext();

    // Schema Score
    const schemaScore = useMemo<SchemaScore>(() => {
        const missingFields: string[] = [];
        const suggestions: string[] = [];
        let score = 100;

        const hasSchema = !!meta.schemaType && meta.schemaType !== "article";

        // Validações específicas por tipo
        if (meta.schemaType === "faq") {
            if (!meta.faq || meta.faq.length === 0) {
                missingFields.push("Perguntas/Respostas FAQ");
                score -= 30;
            }
        }

        if (meta.schemaType === "howto") {
            if (!meta.howto || meta.howto.length === 0) {
                missingFields.push("Passos HowTo");
                score -= 30;
            }
        }

        if (meta.schemaType === "review") {
            // Validação de review (produto Amazon, por exemplo)
            if (!meta.amazonProducts || meta.amazonProducts.length === 0) {
                suggestions.push("Considere adicionar produto Amazon para review completo");
                score -= 10;
            }
        }

        // Detectar FAQ no conteúdo mas schema não é FAQ
        const hasFAQContent = detectFAQInContent(editor);
        if (hasFAQContent && meta.schemaType !== "faq") {
            suggestions.push("⚠️ Detectado FAQ no conteúdo. Considere mudar schema para 'FAQ'.");
            score -= 15;
        }

        return {
            hasSchema,
            schemaType: meta.schemaType || "article",
            missingFields,
            suggestions,
            score: Math.max(0, score)
        };
    }, [meta.schemaType, meta.faq, meta.howto, meta.amazonProducts, editor]);

    // Image Score
    const imageScore = useMemo<ImageScore>(() => {
        const text = editor?.getText() ?? "";
        const visualPlaceholders = (text.match(/\[PLANO VISUAL\]/g) ?? []).length;
        const hasHero = !!meta.heroImageUrl?.trim();
        const hasHeroAlt = !!meta.heroImageAlt?.trim();
        const hasOgOrHero = !!meta.ogImageUrl?.trim() || hasHero;
        const bodyImages = meta.images.filter((img) => img.url && img.url !== meta.heroImageUrl && img.kind !== "hero" && img.kind !== "og").length;
        const total = new Set([meta.heroImageUrl, ...meta.images.map((img) => img.url)].filter(Boolean)).size;
        const withAlt = meta.images.filter(img => img.alt && img.alt.trim().length > 0).length + (hasHero && hasHeroAlt ? 1 : 0);
        const withoutAlt = total - withAlt;
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        const issues: string[] = [];

        let score = 100;
        if (!hasHero) {
            issues.push("Capa obrigatoria ausente");
            score -= 35;
        }
        if (hasHero && !hasHeroAlt) {
            issues.push("Capa sem ALT text");
            score -= 20;
        }
        if (!hasOgOrHero) {
            issues.push("OG image ausente e sem capa para herdar");
            score -= 10;
        }
        if (wordCount >= 900 && bodyImages < 1) {
            issues.push("Artigo longo sem imagem util no corpo");
            score -= 20;
        }
        if (visualPlaceholders > 0) {
            issues.push("Substitua marcadores [PLANO VISUAL] por imagens reais antes de publicar");
            score -= 25;
        }
        if (total < 2 && wordCount >= 500) {
            score -= 10;
        }
        if (withoutAlt > 0) {
            score -= withoutAlt * 15;
        }

        return {
            total,
            withAlt,
            withoutAlt,
            hasHero,
            hasHeroAlt,
            hasOgOrHero,
            bodyImages,
            visualPlaceholders,
            issues,
            score: Math.max(0, score)
        };
    }, [meta.images, meta.heroImageUrl, meta.heroImageAlt, meta.ogImageUrl, editor]);

    // EEAT Score
    const eeatScore = useMemo<EEATScore>(() => {
        const issues: string[] = [];
        let score = 100;

        const hasAuthor = !!meta.authorName && meta.authorName.trim().length > 0;
        const hasExpert = !!meta.expertName && meta.expertName.trim().length > 0;
        const hasReviewer = !!meta.reviewedBy && meta.reviewedBy.trim().length > 0;
        const hasSources = meta.sources && meta.sources.length > 0;

        // TODO: Implementar checkbox "Conteúdo sensível" (YMYL)
        const isSensitive = false; // Por ora, sempre false

        if (!hasAuthor) {
            issues.push("Autor não definido");
            score -= 20;
        }

        if (isSensitive) {
            // Conteúdo sensível requer mais rigor
            if (!hasExpert) {
                issues.push("Conteúdo sensível sem especialista");
                score -= 30;
            }
            if (!hasReviewer) {
                issues.push("Conteúdo sensível sem revisor");
                score -= 20;
            }
            if (!hasSources) {
                issues.push("Conteúdo sensível sem fontes");
                score -= 20;
            }
        } else {
            // Conteúdo normal: especialista/revisor são opcionais mas somam pontos
            if (!hasExpert) {
                issues.push("Especialista não definido (recomendado)");
                score -= 10;
            }
            if (!hasSources) {
                issues.push("Fontes não adicionadas (recomendado)");
                score -= 10;
            }
        }

        return {
            hasAuthor,
            hasExpert,
            hasReviewer,
            hasSources,
            isSensitive,
            score: Math.max(0, score),
            issues
        };
    }, [meta.authorName, meta.expertName, meta.reviewedBy, meta.sources]);

    const overallScore = Math.round((schemaScore.score + imageScore.score + eeatScore.score) / 3);

    return (
        <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
            <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
                <span className="flex items-center gap-1.5">
                    <Shield size={14} />
                    Qualidade (Schema/Img/EEAT)
                </span>
                <span className={`text-[11px] font-bold ${overallScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : overallScore >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {overallScore}/100
                </span>
            </div>

            {/* Schema */}
            <div className="rounded border border-(--border) bg-(--surface) p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-(--text)">
                        <FileCheck size={12} />
                        Schema ({schemaScore.schemaType})
                    </div>
                    <span className={`text-[10px] font-bold ${schemaScore.score >= 80 ? "text-emerald-600" : schemaScore.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {schemaScore.score}/100
                    </span>
                </div>

                {schemaScore.missingFields.length > 0 && (
                    <div className="space-y-0.5">
                        {schemaScore.missingFields.map((field, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-[10px] text-red-700 dark:text-red-400">
                                <AlertCircle size={10} />
                                {field}
                            </div>
                        ))}
                    </div>
                )}

                {schemaScore.suggestions.length > 0 && (
                    <div className="space-y-0.5">
                        {schemaScore.suggestions.map((sugg, idx) => (
                            <div key={idx} className="text-[10px] text-amber-700 dark:text-amber-400">
                                {sugg}
                            </div>
                        ))}
                    </div>
                )}

                {schemaScore.missingFields.length === 0 && schemaScore.suggestions.length === 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={10} />
                        Schema configurado corretamente
                    </div>
                )}
            </div>

            {/* Images */}
            <div className="rounded border border-(--border) bg-(--surface) p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-(--text)">
                        <ImageIcon size={12} />
                        Imagens
                    </div>
                    <span className={`text-[10px] font-bold ${imageScore.score >= 80 ? "text-emerald-600" : imageScore.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {imageScore.score}/100
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex justify-between">
                        <span className="text-(--muted)">Total:</span>
                        <span className="font-bold text-(--text)">{imageScore.total}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-(--muted)">Com ALT:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{imageScore.withAlt}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-(--muted)">Capa:</span>
                        <span className={`font-bold ${imageScore.hasHero ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {imageScore.hasHero ? "ok" : "faltando"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-(--muted)">Corpo:</span>
                        <span className="font-bold text-(--text)">{imageScore.bodyImages}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                        <span className="text-(--muted)">Sem ALT:</span>
                        <span className={`font-bold ${imageScore.withoutAlt > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {imageScore.withoutAlt}
                        </span>
                    </div>
                </div>

                {imageScore.withoutAlt > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-red-700 dark:text-red-400">
                        <AlertCircle size={10} />
                        Adicione ALT text em todas as imagens (SEO e acessibilidade)
                    </div>
                )}

                {imageScore.total < 2 && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                        <AlertCircle size={10} />
                        Mínimo recomendado: 2 imagens (capa + corpo)
                    </div>
                )}

                {imageScore.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                        <AlertCircle size={10} />
                        {issue}
                    </div>
                ))}
            </div>

            {/* EEAT */}
            <div className="rounded border border-(--border) bg-(--surface) p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-(--text)">
                        <Shield size={12} />
                        E-E-A-T
                    </div>
                    <span className={`text-[10px] font-bold ${eeatScore.score >= 80 ? "text-emerald-600" : eeatScore.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {eeatScore.score}/100
                    </span>
                </div>

                <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                        <span className="text-(--muted)">Autor:</span>
                        {eeatScore.hasAuthor ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 size={10} /> {meta.authorName}
                            </span>
                        ) : (
                            <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                                <AlertCircle size={10} /> Não definido
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                        <span className="text-(--muted)">Especialista:</span>
                        {eeatScore.hasExpert ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 size={10} /> {meta.expertName}
                            </span>
                        ) : (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                <AlertCircle size={10} /> Opcional
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                        <span className="text-(--muted)">Fontes:</span>
                        <span className={meta.sources.length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                            {meta.sources.length} adicionadas
                        </span>
                    </div>
                </div>

                {eeatScore.issues.length > 0 && (
                    <div className="pt-1 border-t border-(--border) space-y-0.5">
                        {eeatScore.issues.map((issue, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                                <AlertCircle size={10} />
                                {issue}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Help */}
            <div className="p-2 rounded border border-(--border) bg-(--surface) text-[10px] text-(--muted-2)">
                <strong className="text-(--text)">Dica:</strong> Alta qualidade (Schema + Imagens + EEAT) melhora ranqueamento
                e confiança dos usuários. Configure tudo no Inspector (painel direito).
            </div>
        </section>
    );
}
