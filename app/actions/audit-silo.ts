"use server";
import { resolveSiteUrl } from "@/lib/site/url";

import { getAdminDatabase } from "@/lib/database";
import { z } from "zod";
import { isGenericAnchor } from "@/lib/seo/siloRules";

function getMissingColumnFromError(error: any): string | null {
    if (!error) return null;
    const message = [error.message, error.details, error.hint].filter(Boolean).join(" ");
    const patterns = [
        /column\s+(?:["]?[a-zA-Z0-9_]+["]?\.)*["]?([a-zA-Z0-9_]+)["]?\s+does not exist/i,
        /Could not find the '([a-zA-Z0-9_]+)' column/i,
        /missing column:\s*["']?([a-zA-Z0-9_]+)["']?/i,
    ];
    for (const regex of patterns) {
        const match = regex.exec(message);
        if (match?.[1]) return match[1];
    }
    return null;
}

function logDbError(label: string, error: any) {
    if (!error) return;
    console.error(label, {
        message: error?.message ?? null,
        details: error?.details ?? null,
        hint: error?.hint ?? null,
        code: error?.code ?? null,
    });
}

const auditSchema = z.object({
    siloId: z.string().uuid(),
    siloSlug: z.string(),
    force: z.boolean().optional(),
    skipAI: z.boolean().optional(),
});

const aiAuditSchema = z
    .object({
        linkSuggestions: z.array(
            z.object({
                occurrenceId: z.string(),
                suggested_anchor: z.union([z.string(), z.array(z.string())]).optional().nullable(),
                suggestion_note: z.string().optional().nullable(),
                intent_match: z.number().min(0).max(100).optional().nullable(),
                coherence_note: z.string().optional().nullable(),
                remove_link_if: z.string().optional().nullable(),
            })
        ).default([]),
    })
    .strict();

type SiloIssue = {
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    action?: string;
    targetPostId?: string;
    occurrenceId?: string;
};

const STOP_WORDS_LIST = [
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "o",
    "a",
    "os",
    "as",
    "para",
    "por",
    "com",
    "sem",
    "um",
    "uma",
    "uns",
    "umas",
    "no",
    "na",
    "nos",
    "nas",
    "em",
    "ao",
    "aos",
    "que",
    "como",
    "mais",
    "melhor",
    "melhores",
    "guia",
    "review",
    "comparativo",
];
const STOP_WORDS = new Set(STOP_WORDS_LIST);

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function stripHtml(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ");
}

function countWords(text: string): number {
    if (!text) return 0;
    return normalizeText(text).split(" ").filter(Boolean).length;
}

const CRITICAL_REASONS = new Set([
    "ANCHOR_GENERIC",
    "ANCHOR_TOO_SHORT",
    "MISMATCH_TOPIC",
    "HIERARCHY_VIOLATION",
    "OVER_OPTIMIZED_ANCHOR",
    "LINK_CHAINING",
    "SUPPORT_NOT_LINKING_PILLAR",
    "HIDDEN_LINK_PATTERN",
]);

const WARNING_REASONS = new Set([
    "ANCHOR_VAGUE",
    "LOW_VALUE_LINK",
    "HIGH_LINK_DENSITY",
    "SAME_TARGET_TOO_MANY",
    "POTENTIAL_SPAM_PATTERN",
]);


function extractKeywords(text: string): string[] {
    if (!text) return [];
    return normalizeText(text)
        .split(" ")
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function intersectCount(a: string[], b: string[]): number {
    if (!a.length || !b.length) return 0;
    const setB = new Set(b);
    let count = 0;
    a.forEach((word) => {
        if (setB.has(word)) count += 1;
    });
    return count;
}

function clampScore(value: number): number {
    return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeLinkType(value: unknown): "INTERNAL" | "EXTERNAL" | "AFFILIATE" | null {
    if (!value) return null;
    const upper = String(value).toUpperCase();
    if (upper === "INTERNAL" || upper === "EXTERNAL" || upper === "AFFILIATE") {
        return upper as "INTERNAL" | "EXTERNAL" | "AFFILIATE";
    }
    if (upper === "AMAZON") return "AFFILIATE";
    return null;
}

function mapOccurrenceForClient(
    occurrence: any,
    fallbackSiloId: string
) {
    return {
        id: String(occurrence?.id ?? ""),
        silo_id: String(occurrence?.silo_id ?? fallbackSiloId),
        source_post_id: String(occurrence?.source_post_id ?? ""),
        target_post_id: occurrence?.target_post_id ? String(occurrence.target_post_id) : null,
        anchor_text: occurrence?.anchor_text ?? "[Sem texto]",
        context_snippet: occurrence?.context_snippet ?? null,
        start_index: occurrence?.start_index ?? null,
        end_index: occurrence?.end_index ?? null,
        occurrence_key: occurrence?.occurrence_key ?? null,
        href_normalized: occurrence?.href_normalized ?? "",
        position_bucket: occurrence?.position_bucket ?? null,
        link_type: normalizeLinkType(occurrence?.link_type),
        is_nofollow: Boolean(occurrence?.is_nofollow),
        is_sponsored: Boolean(occurrence?.is_sponsored),
        is_ugc: Boolean(occurrence?.is_ugc),
        is_blank: Boolean(occurrence?.is_blank),
    };
}

function buildLinkEdgesFromOccurrences(
    occurrences: Array<any>
) {
    const map = new Map<string, { id: string; source_post_id: string; target_post_id: string; occurrence_ids: string[] }>();
    occurrences.forEach((occ) => {
        const targetPostId = occ?.target_post_id ? String(occ.target_post_id) : "";
        const sourcePostId = String(occ?.source_post_id ?? "");
        const occurrenceId = String(occ?.id ?? "");
        const linkType = normalizeLinkType(occ?.link_type) ?? "INTERNAL";
        if (!sourcePostId || !targetPostId || !occurrenceId) return;
        if (linkType !== "INTERNAL") return;

        const key = `${sourcePostId}::${targetPostId}`;
        const existing = map.get(key);
        if (!existing) {
            map.set(key, {
                id: `edge-${sourcePostId}-${targetPostId}`,
                source_post_id: sourcePostId,
                target_post_id: targetPostId,
                occurrence_ids: [occurrenceId],
            });
            return;
        }
        existing.occurrence_ids.push(occurrenceId);
    });
    return Array.from(map.values());
}

function buildSuggestedAnchor(
    targetTitle?: string | null,
    targetKeyword?: string | null
): string | undefined {
    const base = (targetKeyword || targetTitle || "").trim();
    if (!base) return undefined;
    return base.length > 90 ? base.slice(0, 90) : base;
}

function buildDeterministicAudit(input: {
    anchorText: string;
    contextSnippet?: string | null;
    sourceRole?: string | null;
    targetRole?: string | null;
    hierarchyViolationReason?: string | null;
    targetTitle?: string;
    targetKeyword?: string | null;
    targetEntities?: string[];
    anchorDuplicateCount: number;
    anchorDuplicateSourceCount: number;
    sameTargetCount: number;
    contextGroupCount: number;
    linkDensity: number;
    internalCount: number;
    supportMissingPillar: boolean;
    genericAnchorRatio: number;
}) {
    const reasons: string[] = [];
    let score = 100;

    const anchorText = input.anchorText || "";
    const anchorWords = extractKeywords(anchorText);
    const targetWords = extractKeywords(
        [input.targetTitle, input.targetKeyword, ...(input.targetEntities || [])].filter(Boolean).join(" ")
    );
    const contextWords = extractKeywords(input.contextSnippet ?? "");

    const generic = isGenericAnchor(anchorText) || anchorWords.length === 0;
    if (generic) {
        score -= 40;
        reasons.push("ANCHOR_GENERIC");
    }

    const overlapAnchor = intersectCount(anchorWords, targetWords);
    const overlapContext = intersectCount(contextWords, targetWords);
    // Short anchors are only critical when neither the anchor nor surrounding context
    // helps identify the destination topic.
    const anchorTooShort = anchorWords.length <= 2 && overlapAnchor === 0 && overlapContext === 0;
    if (anchorTooShort) {
        score -= 20;
        reasons.push("ANCHOR_TOO_SHORT");
    }

    const mismatch = Boolean(targetWords.length && overlapAnchor === 0 && overlapContext === 0);
    if (mismatch) {
        score -= 35;
        reasons.push("MISMATCH_TOPIC");
    }

    if (input.hierarchyViolationReason) {
        score -= 35;
        reasons.push("HIERARCHY_VIOLATION");
    }

    const anchorVague = !generic && anchorWords.length <= 3 && overlapAnchor === 0;
    if (anchorVague) {
        score -= 10;
        reasons.push("ANCHOR_VAGUE");
    }

    const overOptimized = input.anchorDuplicateSourceCount >= 3 || input.anchorDuplicateCount >= 3;
    if (overOptimized) {
        score -= 20;
        reasons.push("OVER_OPTIMIZED_ANCHOR");
    }

    const linkChaining = input.contextGroupCount >= 3;
    if (linkChaining) {
        score -= 15;
        reasons.push("LINK_CHAINING");
    }

    const hiddenPattern =
        anchorText.trim().length <= 1 ||
        anchorText === "[Sem texto]" ||
        anchorText === "[Imagem]";
    if (hiddenPattern) {
        score -= 40;
        reasons.push("HIDDEN_LINK_PATTERN");
    }

    if (input.supportMissingPillar) {
        score -= 25;
        reasons.push("SUPPORT_NOT_LINKING_PILLAR");
    }

    const sameTargetTooMany = input.sameTargetCount >= 4;
    if (sameTargetTooMany) {
        score -= 12;
        reasons.push("SAME_TARGET_TOO_MANY");
    }

    const highLinkDensity = input.linkDensity >= 4 && input.internalCount >= 6;
    if (highLinkDensity) {
        score -= 12;
        reasons.push("HIGH_LINK_DENSITY");
    }

    const lowValueLink =
        input.sourceRole === "SUPPORT" &&
        input.targetRole === "SUPPORT" &&
        overlapAnchor === 0 &&
        overlapContext === 0;
    if (lowValueLink) {
        score -= 10;
        reasons.push("LOW_VALUE_LINK");
    }

    if (overlapAnchor >= 2) {
        score += 8;
        reasons.push("GOOD_MATCH");
    } else if (overlapAnchor === 1) {
        score += 4;
        reasons.push("PARTIAL_MATCH");
    }

    if (input.sourceRole === "SUPPORT" && input.targetRole === "PILLAR") {
        score += 6;
        reasons.push("PILLAR_SUPPORT_OK");
    }

    if (input.sourceRole === "PILLAR" && input.targetRole === "SUPPORT") {
        score += 4;
        reasons.push("PILLAR_DISTRIBUTION_OK");
    }

    const spamRiskBase = [
        generic ? 20 : 0,
        anchorTooShort ? 10 : 0,
        overOptimized ? 25 : 0,
        linkChaining ? 20 : 0,
        sameTargetTooMany ? 15 : 0,
        highLinkDensity ? 20 : 0,
        input.genericAnchorRatio >= 0.3 && input.internalCount >= 6 ? 15 : 0,
    ].reduce((sum, val) => sum + val, 0);

    const spamRisk = clampScore(spamRiskBase);
    if (spamRisk >= 40) {
        reasons.push("POTENTIAL_SPAM_PATTERN");
        score -= spamRisk >= 70 ? 20 : 10;
    }

    score = clampScore(score);

    const uniqueReasons = Array.from(new Set(reasons));
    const hasCritical = uniqueReasons.some((reason) => CRITICAL_REASONS.has(reason)) || spamRisk >= 70;
    const hasWarning = uniqueReasons.some((reason) => WARNING_REASONS.has(reason));

    const descriptiveAnchor = anchorWords.length >= 3 && overlapAnchor >= 1;
    let label: "STRONG" | "OK" | "WEAK" = "OK";

    if (hasCritical) label = "WEAK";
    else if (hasWarning) label = "OK";
    else if (score >= 80 && descriptiveAnchor && overlapContext >= 1) label = "STRONG";
    else label = "OK";

    return {
        score,
        label,
        reasons: uniqueReasons,
        suggestedAnchor: buildSuggestedAnchor(input.targetTitle, input.targetKeyword),
        mismatch,
        spamRisk,
        hasCritical,
        hasWarning,
    };
}

function mergeAudit(
    baseAudit: ReturnType<typeof buildDeterministicAudit>,
    aiAudit?: {
        suggested_anchor?: string[] | string | null;
        suggestion_note?: string | null;
        intent_match?: number | null;
        coherence_note?: string | null;
        remove_link_if?: string | null;
    }
) {
    const suggestedFromAI = aiAudit?.suggested_anchor;
    const suggestedAnchor =
        Array.isArray(suggestedFromAI)
            ? suggestedFromAI.filter(Boolean).join(" | ")
            : (suggestedFromAI || baseAudit.suggestedAnchor || undefined) ?? undefined;

    const noteParts = [
        aiAudit?.suggestion_note,
        aiAudit?.coherence_note,
        aiAudit?.remove_link_if ? `Remover se: ${aiAudit.remove_link_if}` : null,
    ].filter(Boolean);

    let score = baseAudit.score;
    if (typeof aiAudit?.intent_match === "number" && !baseAudit.hasCritical) {
        const delta = Math.round((aiAudit.intent_match - 50) / 10);
        score = clampScore(score + delta);
    }

    let label = baseAudit.label;
    if (baseAudit.hasCritical) {
        label = "WEAK";
        score = Math.min(score, 49);
    } else if (baseAudit.hasWarning && score >= 80) {
        label = "OK";
    } else if (!baseAudit.hasWarning && score >= 80) {
        label = "STRONG";
    } else if (score < 50) {
        label = "WEAK";
    } else {
        label = "OK";
    }

    return {
        score,
        label,
        reasons: baseAudit.reasons,
        suggestedAnchor,
        note: noteParts.length ? noteParts.join(" ") : undefined,
        mismatch: baseAudit.mismatch,
        spamRisk: baseAudit.spamRisk,
        intentMatch: typeof aiAudit?.intent_match === "number" ? aiAudit.intent_match : undefined,
        hasCritical: baseAudit.hasCritical,
        hasWarning: baseAudit.hasWarning,
    };
}

function pickAction(reasons: string[]) {
    if (reasons.includes("HIERARCHY_VIOLATION")) {
        return "CHANGE_TARGET";
    }
    if (reasons.includes("HIDDEN_LINK_PATTERN") || reasons.includes("LINK_CHAINING") || reasons.includes("OVER_OPTIMIZED_ANCHOR")) {
        return "REMOVE_LINK";
    }
    if (reasons.includes("HIGH_LINK_DENSITY") || reasons.includes("SAME_TARGET_TOO_MANY") || reasons.includes("POTENTIAL_SPAM_PATTERN")) {
        return "REMOVE_LINK";
    }
    if (reasons.includes("MISMATCH_TOPIC") || reasons.includes("LOW_VALUE_LINK")) {
        return "CHANGE_TARGET";
    }
    if (reasons.includes("SUPPORT_NOT_LINKING_PILLAR")) {
        return "ADD_INTERNAL_LINK";
    }
    if (reasons.includes("ANCHOR_GENERIC") || reasons.includes("ANCHOR_TOO_SHORT") || reasons.includes("ANCHOR_VAGUE")) {
        return "CHANGE_ANCHOR";
    }
    return "KEEP";
}

function buildRecommendation(action: string, suggestedAnchor?: string) {
    if (action === "CHANGE_ANCHOR") {
        return suggestedAnchor
            ? `Use a ancora sugerida: "${suggestedAnchor}".`
            : "Troque a ancora por um termo descritivo do destino.";
    }
    if (action === "CHANGE_TARGET") {
        return "Aponte para a pagina mais relevante do silo (idealmente o Pilar).";
    }
    if (action === "REMOVE_LINK") {
        return "Remova ou reduza este link para evitar excesso ou padrao de spam.";
    }
    if (action === "ADD_INTERNAL_LINK") {
        return "Adicione um link do post de suporte/apoio para o Pilar com ancora descritiva.";
    }
    return "Link OK. Manter.";
}

async function generateFingerprint(data: any): Promise<string> {
    const str = JSON.stringify(data);
    try {
        const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    } catch (e) {
        return `hash-${Date.now()}`;
    }
}

type NormalizedHierarchyEntry = {
    role: "PILLAR" | "SUPPORT" | "AUX";
    supportIndex: number | null;
};

function rankPosition(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function normalizeSiloHierarchy(args: {
    posts: Array<{ id: string; title?: string | null }>;
    siloPosts: Array<{ post_id: string; role: string | null; position: number | null }>;
}) {
    const byPost = new Map(args.siloPosts.map((row) => [row.post_id, row]));
    const sortByPositionThenTitle = (a: { id: string; title?: string | null }, b: { id: string; title?: string | null }) => {
        const aPos = rankPosition(byPost.get(a.id)?.position);
        const bPos = rankPosition(byPost.get(b.id)?.position);
        if (aPos !== bPos) return aPos - bPos;
        return String(a.title ?? "").localeCompare(String(b.title ?? ""), "pt-BR");
    };

    const explicitPillar = args.posts
        .filter((post) => String(byPost.get(post.id)?.role ?? "").toUpperCase() === "PILLAR")
        .sort(sortByPositionThenTitle)[0];
    const fallbackPillar = [...args.posts].sort(sortByPositionThenTitle)[0];
    const pillarId = explicitPillar?.id ?? fallbackPillar?.id ?? null;

    const map = new Map<string, NormalizedHierarchyEntry>();
    if (!pillarId) return { map, pillarId: null as string | null };

    map.set(pillarId, { role: "PILLAR", supportIndex: null });

    const supports = args.posts
        .filter((post) => post.id !== pillarId && String(byPost.get(post.id)?.role ?? "").toUpperCase() !== "AUX")
        .sort(sortByPositionThenTitle);
    supports.forEach((post, index) => {
        map.set(post.id, { role: "SUPPORT", supportIndex: index + 1 });
    });

    const aux = args.posts
        .filter((post) => post.id !== pillarId && String(byPost.get(post.id)?.role ?? "").toUpperCase() === "AUX")
        .sort(sortByPositionThenTitle);
    aux.forEach((post) => {
        map.set(post.id, { role: "AUX", supportIndex: null });
    });

    return { map, pillarId };
}

function getHierarchyViolationReason(args: {
    sourceId: string;
    targetId: string;
    hierarchyMap: Map<string, NormalizedHierarchyEntry>;
}) {
    const source = args.hierarchyMap.get(args.sourceId);
    const target = args.hierarchyMap.get(args.targetId);
    if (!source || !target) return null;

    if (source.role === "PILLAR") {
        return target.role === "SUPPORT" ? null : "Pilar so pode linkar para suportes.";
    }

    if (source.role === "SUPPORT") {
        if (target.role === "PILLAR") return null;
        if (
            target.role === "SUPPORT" &&
            typeof source.supportIndex === "number" &&
            typeof target.supportIndex === "number" &&
            Math.abs(source.supportIndex - target.supportIndex) === 1
        ) {
            return null;
        }
        return "Suporte so pode linkar para o Pilar ou suportes vizinhos (N-1/N+1).";
    }

    if (source.role === "AUX") {
        return target.role === "PILLAR" ? null : "Auxiliar so pode linkar para o Pilar.";
    }

    return null;
}

export async function auditSiloAction(payload: z.infer<typeof auditSchema>) {
    const database = getAdminDatabase();
    const { siloId, siloSlug, force, skipAI } = payload;
    let aiStatus: "skipped" | "success" | "failed" = "skipped";

    try {
        const siteUrl = resolveSiteUrl();
        const { data: postsForSync, error: postsForSyncError } = await database
            .from("posts")
            .select("id, slug, canonical_path, content_html")
            .eq("silo_id", siloId);
        if (postsForSyncError) {
            logDbError("[SILO-AUDIT] posts sync preload error", postsForSyncError);
        }

        const syncPostIds = (postsForSync ?? []).map((post) => String(post.id));
        if ((postsForSync ?? []).length > 0) {
            try {
                const { syncLinkOccurrences } = await import("@/lib/silo/siloService");
                const syncContextPosts = (postsForSync ?? []).map((post) => ({
                    id: String(post.id),
                    slug: post.slug ?? null,
                    canonical_path: post.canonical_path ?? null,
                }));
                const syncResults = await Promise.allSettled(
                    (postsForSync ?? []).map((post) =>
                        syncLinkOccurrences(siloId, String(post.id), post.content_html ?? "", {
                            posts: syncContextPosts,
                            siloSlug,
                            siteUrl,
                        })
                    )
                );
                const syncFailed = syncResults.filter((item) => item.status === "rejected").length;
                if (syncFailed > 0) {
                    console.warn("[SILO-AUDIT] sync parcial", {
                        siloId,
                        posts: postsForSync?.length ?? 0,
                        syncFailed,
                    });
                }
            } catch (syncError) {
                console.error("[SILO-AUDIT] falha ao sincronizar ocorrencias antes da auditoria", syncError);
            }
        }

        let occurrences: any[] = [];
        {
            let occurrenceQuery = database
                .from("post_link_occurrences")
                .select("id, source_post_id, target_post_id, anchor_text, context_snippet, position_bucket, link_type, updated_at")
                .eq("silo_id", siloId);
            if (syncPostIds.length > 0) {
                occurrenceQuery = occurrenceQuery.in("source_post_id", syncPostIds);
            }
            const { data, error } = await occurrenceQuery.order("id");
            if (error) {
                logDbError("[SILO-AUDIT] occurrences query error", error);
            } else {
                occurrences = data ?? [];
            }
        }
        const occurrenceById = new Map(
            (occurrences ?? []).map((occ) => [String(occ.id), occ])
        );
        const buildGraphSnapshotForClient = () => {
            const occurrenceList = (occurrences ?? []).map((occ) => mapOccurrenceForClient(occ, siloId));
            return {
                occurrences: occurrenceList,
                linkEdges: buildLinkEdgesFromOccurrences(occurrenceList),
            };
        };

        const { data: siloPosts } = await database
            .from("silo_posts")
            .select("post_id, role, position")
            .eq("silo_id", siloId)
            .order("post_id");

        const roleMap = new Map(siloPosts?.map((p) => [p.post_id, p.role]));

        const internalOccurrences =
            occurrences?.filter((occ) => {
                if (!occ.target_post_id) return false;
                const linkType = occ.link_type ? String(occ.link_type).toUpperCase() : null;
                if (linkType && linkType !== "INTERNAL") return false;
                return true;
            }) || [];

        console.log("[SILO-AUDIT] snapshot", {
            siloId,
            posts: siloPosts?.length ?? 0,
            occurrences: occurrences?.length ?? 0,
            occurrencesWithTarget: occurrences?.filter((occ) => Boolean(occ.target_post_id)).length ?? 0,
            internalOccurrences: internalOccurrences.length,
            roleMapSize: roleMap.size,
            sampleOccurrenceIds: internalOccurrences.slice(0, 3).map((occ) => occ.id),
        });

        const currentFingerprint = await generateFingerprint({
            posts: siloPosts,
            links: internalOccurrences.map((o) => ({
                id: o.id,
                source: o.source_post_id,
                target: o.target_post_id,
                anchor: o.anchor_text,
                context: o.context_snippet,
                position: o.position_bucket,
                updated_at: o.updated_at,
            })),
        });

        if (!force) {
            const { data: existingAudit } = await database
                .from("silo_audits")
                .select("fingerprint")
                .eq("silo_id", siloId)
                .single();

            if (existingAudit && existingAudit.fingerprint === currentFingerprint) {
                const { data: linkAuditsCached, error: linkAuditsError } = await database
                    .from("link_audits")
                    .select("occurrence_id, score, label, reasons, suggested_anchor, note, action, recommendation, spam_risk, intent_match")
                    .eq("silo_id", siloId);

                if (linkAuditsError) {
                    logDbError("[SILO-AUDIT] cache link_audits error", linkAuditsError);
                }

                const { data: siloAuditList } = await database
                    .from("silo_audits")
                    .select("*")
                    .eq("silo_id", siloId)
                    .order("created_at", { ascending: false })
                    .limit(1);

                if ((linkAuditsCached ?? []).length > 0) {
                    const graphSnapshot = buildGraphSnapshotForClient();
                    return {
                        success: true,
                        message: "Auditoria ja esta atualizada (Cache).",
                        cached: true,
                        linkAudits: (linkAuditsCached || []).map((audit) => ({
                            occurrenceId: audit.occurrence_id,
                            occurrence_id: audit.occurrence_id,
                            source_post_id: occurrenceById.get(String(audit.occurrence_id))?.source_post_id ?? null,
                            target_post_id: occurrenceById.get(String(audit.occurrence_id))?.target_post_id ?? null,
                            score: audit.score,
                            label: audit.label,
                            reasons: audit.reasons,
                            suggested_anchor: audit.suggested_anchor,
                            note: audit.note,
                            action: audit.action,
                            recommendation: audit.recommendation,
                            spam_risk: audit.spam_risk,
                            intent_match: audit.intent_match,
                        })),
                        occurrences: graphSnapshot.occurrences,
                        linkEdges: graphSnapshot.linkEdges,
                        siloAudit: siloAuditList?.[0] ?? null,
                    };
                }

                console.warn("[SILO-AUDIT] cache empty, recomputing audits", {
                    siloId,
                    fingerprint: currentFingerprint,
                });
            }
        }

        const postIds = siloPosts?.map((p) => p.post_id) || [];
        let postsData: any[] = [];
        let postsError: any = null;
        if (postIds.length) {
            const loadPosts = async (select: string) => {
                return database.from("posts").select(select).in("id", postIds);
            };

            {
                const { data, error } = await loadPosts("id, title, slug, focus_keyword, entities, content_html");
                postsData = data ?? [];
                postsError = error;
            }

            if (postsError) {
                const missing = getMissingColumnFromError(postsError);
                if (missing === "focus_keyword") {
                    const { data, error } = await loadPosts("id, title, slug, entities, content_html");
                    postsData = (data ?? []).map((row: any) => ({ ...row, focus_keyword: null }));
                    postsError = error;
                }
            }
        }

        if (postsError) {
            logDbError("[SILO-AUDIT] posts query error", postsError);
            return { success: false, message: "Falha ao carregar posts do silo para auditoria." };
        }

        const postsMap = new Map(postsData.map((p) => [p.id, p]));
        const normalizedHierarchy = normalizeSiloHierarchy({
            posts: postsData.map((post) => ({ id: String(post.id), title: post.title ?? "" })),
            siloPosts: (siloPosts ?? []).map((row) => ({
                post_id: String(row.post_id),
                role: row.role ?? null,
                position: typeof row.position === "number" ? row.position : null,
            })),
        });
        const pillarId = normalizedHierarchy.pillarId;
        const supports = Array.from(normalizedHierarchy.map.entries())
            .filter(([, entry]) => entry.role === "SUPPORT")
            .map(([postId]) => postId);
        const aux = Array.from(normalizedHierarchy.map.entries())
            .filter(([, entry]) => entry.role === "AUX")
            .map(([postId]) => postId);
        const supportAndAux = [...supports, ...aux];

        const issues: SiloIssue[] = [];
        let healthScore = 100;

        if (!pillarId) {
            healthScore -= 40;
            issues.push({ severity: "critical", message: "Pilar nao definido.", action: "Defina o Pilar." });
        }

        const inboundCount = new Map<string, number>();
        const outboundCount = new Map<string, number>();
        internalOccurrences.forEach((occ) => {
            inboundCount.set(occ.target_post_id!, (inboundCount.get(occ.target_post_id!) ?? 0) + 1);
            outboundCount.set(occ.source_post_id, (outboundCount.get(occ.source_post_id) ?? 0) + 1);
        });

        siloPosts?.forEach((sp) => {
            const inbound = inboundCount.get(sp.post_id) ?? 0;
            const outbound = outboundCount.get(sp.post_id) ?? 0;
            if (inbound === 0 && outbound === 0) {
                healthScore -= 5;
                const title = postsMap.get(sp.post_id)?.title ?? "Post isolado";
                issues.push({
                    severity: "medium",
                    message: `Post isolado (sem links): ${title}`,
                    targetPostId: sp.post_id,
                });
            }
        });

        const supportOrAuxWithoutPillar: string[] = [];
        if (pillarId) {
            supportAndAux.forEach((postId) => {
                const hasLink = internalOccurrences.some(
                    (o) => o.source_post_id === postId && o.target_post_id === pillarId
                );
                if (!hasLink) supportOrAuxWithoutPillar.push(postId);
            });
        }

        if (supportOrAuxWithoutPillar.length) {
            healthScore -= Math.min(30, supportOrAuxWithoutPillar.length * 10);
            supportOrAuxWithoutPillar.forEach((postId) => {
                const role = normalizedHierarchy.map.get(postId)?.role ?? "SUPPORT";
                const roleLabel = role === "AUX" ? "Apoio" : "Suporte";
                issues.push({
                    severity: "high",
                    message: `${roleLabel} nao linka para o Pilar.`,
                    action: "Adicione um link para o Pilar com ancora descritiva.",
                    targetPostId: postId,
                });
            });
        }

        const pillarMissingSupports: string[] = [];
        if (pillarId) {
            supports.forEach((supId) => {
                const hasLink = internalOccurrences.some(
                    (o) => o.source_post_id === pillarId && o.target_post_id === supId
                );
                if (!hasLink) pillarMissingSupports.push(supId);
            });
        }

        if (pillarMissingSupports.length) {
            healthScore -= Math.min(8, pillarMissingSupports.length * 2);
            issues.push({
                severity: "low",
                message: "Recomendado: Pilar distribuir links para suportes quando fizer sentido.",
                action: "Inclua links do Pilar para suportes publicados ao longo da evolucao do silo.",
                targetPostId: pillarId ?? undefined,
            });
        }

        const hierarchyViolationByOccurrenceId = new Map<string, string>();
        internalOccurrences.forEach((occ) => {
            const targetId = occ.target_post_id ? String(occ.target_post_id) : null;
            if (!targetId) return;
            const reason = getHierarchyViolationReason({
                sourceId: String(occ.source_post_id),
                targetId,
                hierarchyMap: normalizedHierarchy.map,
            });
            if (!reason) return;
            hierarchyViolationByOccurrenceId.set(String(occ.id), reason);
        });

        if (hierarchyViolationByOccurrenceId.size > 0) {
            healthScore -= Math.min(35, hierarchyViolationByOccurrenceId.size * 6);
            Array.from(hierarchyViolationByOccurrenceId.entries())
                .slice(0, 12)
                .forEach(([occurrenceId, reason]) => {
                    issues.push({
                        severity: "high",
                        message: "Link interno viola a hierarquia do silo.",
                        action: reason,
                        occurrenceId,
                    });
                });
        }

        const anchorCounts = new Map<string, number>();
        const anchorSourceCounts = new Map<string, number>();
        const targetCounts = new Map<string, number>();
        const contextCounts = new Map<string, number>();
        const internalCountsBySource = new Map<string, number>();
        const genericCountsBySource = new Map<string, number>();

        const wordCountByPost = new Map<string, number>();
        postsData?.forEach((post) => {
            const html = typeof post.content_html === "string" ? post.content_html : "";
            const wordCount = countWords(stripHtml(html));
            wordCountByPost.set(post.id, wordCount);
        });

        internalOccurrences.forEach((occ) => {
            const pairKey = `${occ.source_post_id}::${occ.target_post_id}`;
            const anchorKey = `${pairKey}::${normalizeText(occ.anchor_text || "")}`;
            anchorCounts.set(anchorKey, (anchorCounts.get(anchorKey) ?? 0) + 1);

            const anchorSourceKey = `${occ.source_post_id}::${normalizeText(occ.anchor_text || "")}`;
            anchorSourceCounts.set(anchorSourceKey, (anchorSourceCounts.get(anchorSourceKey) ?? 0) + 1);

            const targetKey = `${occ.source_post_id}::${occ.target_post_id}`;
            targetCounts.set(targetKey, (targetCounts.get(targetKey) ?? 0) + 1);

            const contextNorm = normalizeText(occ.context_snippet || "");
            const contextKey =
                contextNorm.length >= 20
                    ? `${occ.source_post_id}::${contextNorm}`
                    : `${occ.source_post_id}::${occ.id}`;
            contextCounts.set(contextKey, (contextCounts.get(contextKey) ?? 0) + 1);

            internalCountsBySource.set(
                occ.source_post_id,
                (internalCountsBySource.get(occ.source_post_id) ?? 0) + 1
            );
            if (isGenericAnchor(occ.anchor_text || "")) {
                genericCountsBySource.set(
                    occ.source_post_id,
                    (genericCountsBySource.get(occ.source_post_id) ?? 0) + 1
                );
            }
        });

        const supportsMissingPillarSet = new Set(supportOrAuxWithoutPillar);

        const linkAuditsBase = internalOccurrences.map((occ) => {
            const targetPost = postsMap.get(occ.target_post_id!);
            const sourceHierarchy = normalizedHierarchy.map.get(String(occ.source_post_id));
            const targetHierarchy = normalizedHierarchy.map.get(String(occ.target_post_id!));
            const internalCount = internalCountsBySource.get(occ.source_post_id) ?? 0;
            const genericCount = genericCountsBySource.get(occ.source_post_id) ?? 0;
            const wordCount = wordCountByPost.get(occ.source_post_id) ?? 0;
            const linkDensity = wordCount > 0 ? internalCount / (wordCount / 100) : internalCount;
            const baseAudit = buildDeterministicAudit({
                anchorText: occ.anchor_text,
                contextSnippet: occ.context_snippet,
                sourceRole: sourceHierarchy?.role ?? roleMap.get(occ.source_post_id) ?? null,
                targetRole: targetHierarchy?.role ?? roleMap.get(occ.target_post_id!) ?? null,
                hierarchyViolationReason: hierarchyViolationByOccurrenceId.get(String(occ.id)) ?? null,
                targetTitle: targetPost?.title,
                targetKeyword: targetPost?.focus_keyword ?? null,
                targetEntities: Array.isArray(targetPost?.entities) ? targetPost?.entities.filter(Boolean).slice(0, 10) : [],
                anchorDuplicateCount:
                    anchorCounts.get(`${occ.source_post_id}::${occ.target_post_id}::${normalizeText(occ.anchor_text || "")}`) ??
                    1,
                anchorDuplicateSourceCount:
                    anchorSourceCounts.get(`${occ.source_post_id}::${normalizeText(occ.anchor_text || "")}`) ?? 1,
                sameTargetCount: targetCounts.get(`${occ.source_post_id}::${occ.target_post_id}`) ?? 1,
                contextGroupCount: contextCounts.get(`${occ.source_post_id}::${normalizeText(occ.context_snippet || "")}`) ?? 1,
                linkDensity,
                internalCount,
                supportMissingPillar: supportsMissingPillarSet.has(occ.source_post_id),
                genericAnchorRatio: internalCount ? genericCount / internalCount : 0,
            });

            return {
                occurrence: occ,
                baseAudit,
            };
        });

        type AiAuditResult = z.infer<typeof aiAuditSchema>;
        let aiResult: AiAuditResult | null = null;
        if (internalOccurrences.length && !skipAI) {
            try {
                const { auditSiloWithAI } = await import("@/lib/silo/aiAuditService");

                const aiPayload = {
                    siloName: siloSlug,
                    links: internalOccurrences.map((occ) => {
                        const snippet = (occ.context_snippet ?? "").replace(/\s+/g, " ").trim();
                        const sourcePost = postsMap.get(occ.source_post_id);
                        const targetPost = postsMap.get(occ.target_post_id!);
                        const sourceKeywords = [
                            sourcePost?.focus_keyword,
                            ...(Array.isArray(sourcePost?.entities) ? sourcePost?.entities.slice(0, 5) : []),
                        ].filter(Boolean) as string[];
                        const targetKeywords = [
                            targetPost?.focus_keyword,
                            ...(Array.isArray(targetPost?.entities) ? targetPost?.entities.slice(0, 10) : []),
                        ].filter(Boolean) as string[];

                        return {
                            occurrenceId: occ.id,
                            sourceTitle: sourcePost?.title ?? "",
                            targetTitle: targetPost?.title ?? "",
                            anchorText: occ.anchor_text,
                            contextSnippet: snippet.length > 240 ? snippet.slice(0, 240) : snippet,
                            sourceFocusKeywords: sourceKeywords.length ? sourceKeywords : undefined,
                            targetFocusKeywords: targetKeywords.length ? targetKeywords : undefined,
                        };
                    }),
                };

                const rawAI = await auditSiloWithAI(aiPayload);
                const parsed = aiAuditSchema.safeParse(rawAI);
                if (parsed.success) {
                    aiResult = parsed.data;
                    aiStatus = "success";
                } else {
                    aiStatus = "failed";
                }
            } catch (e) {
                console.error("AI Integration failed:", e);
                aiStatus = "failed";
            }
        } else if (skipAI) {
            aiStatus = "skipped";
        }

        const aiByOccurrence = new Map<string, AiAuditResult["linkSuggestions"][number]>();
        if (aiResult?.linkSuggestions?.length) {
            aiResult.linkSuggestions.forEach((item) => {
                if (item && item.occurrenceId) aiByOccurrence.set(item.occurrenceId, item);
            });
        }

        const finalLinkAudits = linkAuditsBase.map(({ occurrence, baseAudit }) => {
            const aiAudit = aiByOccurrence.get(occurrence.id);
            const merged = mergeAudit(baseAudit, aiAudit);
            const action = pickAction(merged.reasons);
            const recommendation = buildRecommendation(action, merged.suggestedAnchor);
            return {
                silo_id: siloId,
                occurrence_id: occurrence.id,
                source_post_id: occurrence.source_post_id,
                score: merged.score,
                label: merged.label,
                reasons: merged.reasons,
                suggested_anchor: merged.suggestedAnchor,
                note: merged.note,
                mismatch: merged.mismatch,
                spam_risk: merged.spamRisk,
                intent_match: merged.intentMatch,
                action,
                recommendation,
                target_post_id: occurrence.target_post_id,
            };
        });

        console.log("[SILO-AUDIT] linkAudits", {
            count: finalLinkAudits.length,
            sampleOccurrenceIds: finalLinkAudits.slice(0, 3).map((audit) => audit.occurrence_id),
        });

        const weakCount = finalLinkAudits.filter((a) => a.label === "WEAK").length;
        const okCount = finalLinkAudits.filter((a) => a.label === "OK").length;
        const strongCount = finalLinkAudits.filter((a) => a.label === "STRONG").length;
        const totalLinks = finalLinkAudits.length;
        const weakPct = totalLinks ? (weakCount / totalLinks) * 100 : 0;
        const mismatchCount = finalLinkAudits.filter((a) => a.mismatch).length;
        const genericAnchorCount = finalLinkAudits.filter((a) => a.reasons.includes("ANCHOR_GENERIC")).length;
        const spamRiskHighCount = finalLinkAudits.filter((a) => (a.spam_risk ?? 0) >= 70).length;

        const weakIssues = finalLinkAudits
            .filter((a) => a.label === "WEAK")
            .sort((a, b) => a.score - b.score)
            .slice(0, 5);

        weakIssues.forEach((audit) => {
            const mainReason = audit.reasons[0] || "WEAK_LINK";
            issues.push({
                severity: "high",
                message: `Link fraco (${mainReason})`,
                action: audit.recommendation ?? "Revise a ancora e o contexto do link.",
                occurrenceId: audit.occurrence_id,
                targetPostId: audit.target_post_id ?? undefined,
            });
        });

        const okIssues = finalLinkAudits
            .filter((a) => a.label === "OK")
            .sort((a, b) => a.score - b.score)
            .slice(0, 5);

        okIssues.forEach((audit) => {
            const mainReason = audit.reasons[0] || "ALERTA";
            issues.push({
                severity: "medium",
                message: `Alerta (${mainReason})`,
                action: audit.recommendation ?? "Revise a ancora e o contexto do link.",
                occurrenceId: audit.occurrence_id,
                targetPostId: audit.target_post_id ?? undefined,
            });
        });

        healthScore = clampScore(healthScore);

        let maxScore = 100;
        if (weakPct >= 15) maxScore = Math.min(maxScore, 85);
        if (mismatchCount > 0) maxScore = Math.min(maxScore, 95);
        if (mismatchCount >= 3) maxScore = Math.min(maxScore, 80);
        if (genericAnchorCount >= 5) maxScore = Math.min(maxScore, 70);
        if (supportOrAuxWithoutPillar.length) maxScore = Math.min(maxScore, 60);
        if (pillarMissingSupports.length) maxScore = Math.min(maxScore, 92);
        if (hierarchyViolationByOccurrenceId.size > 0) maxScore = Math.min(maxScore, 65);
        if (hierarchyViolationByOccurrenceId.size >= 3) maxScore = Math.min(maxScore, 55);

        healthScore = Math.min(healthScore, maxScore);
        healthScore = Math.max(0, healthScore);

        const siloStatus = healthScore < 50 ? "CRITICAL" : healthScore < 80 ? "WARNING" : "OK";

        const { error: linkAuditDeleteError } = await database.from("link_audits").delete().eq("silo_id", siloId);
        if (linkAuditDeleteError) {
            logDbError("[SILO-AUDIT] delete link_audits error", linkAuditDeleteError);
        }

        let auditsInserted = 0;
        const linkAuditRows = finalLinkAudits.map((audit) => ({
            silo_id: audit.silo_id,
            occurrence_id: audit.occurrence_id,
            score: audit.score,
            label: audit.label,
            reasons: audit.reasons,
            suggested_anchor: audit.suggested_anchor,
            note: audit.note,
            action: audit.action,
            recommendation: audit.recommendation,
            spam_risk: audit.spam_risk,
            intent_match: audit.intent_match,
        }));

        if (linkAuditRows.length) {
            let payload: any[] = linkAuditRows;
            let insertError: any = null;
            for (let attempt = 0; attempt < 6; attempt += 1) {
                const { error: err } = await database.from("link_audits").insert(payload);
                if (!err) {
                    insertError = null;
                    auditsInserted = payload.length;
                    break;
                }
                insertError = err;
                const missing = getMissingColumnFromError(err);
                if (!missing) break;
                payload = payload.map((row) => {
                    const { [missing]: _, ...rest } = row;
                    return rest;
                });
            }
            if (insertError) {
                logDbError("[SILO-AUDIT] insert link_audits error", insertError);
            }
        }

        const siloAuditPayload = {
            health_score: healthScore,
            status: siloStatus,
            issues,
            summary: {
                total_links: totalLinks,
                weak_pct: Math.round(weakPct),
                weak_count: weakCount,
                ok_count: okCount,
                strong_count: strongCount,
                mismatch_count: mismatchCount,
                generic_anchor_count: genericAnchorCount,
                spam_risk_high_count: spamRiskHighCount,
                supports_without_pillar_count: supportOrAuxWithoutPillar.length,
                pillar_missing_supports_count: pillarMissingSupports.length,
                hierarchy_violations_count: hierarchyViolationByOccurrenceId.size,
                ai_status: aiStatus,
            },
        };

        const { error: siloAuditDeleteError } = await database.from("silo_audits").delete().eq("silo_id", siloId);
        if (siloAuditDeleteError) {
            logDbError("[SILO-AUDIT] delete silo_audits error", siloAuditDeleteError);
        }

        const { error: siloAuditInsertError } = await database.from("silo_audits").insert({
            silo_id: siloId,
            fingerprint: currentFingerprint,
            ...siloAuditPayload,
        });
        if (siloAuditInsertError) {
            logDbError("[SILO-AUDIT] insert silo_audits error", siloAuditInsertError);
        }

        console.log("[SILO-AUDIT] final", {
            occurrences_total: occurrences?.length ?? 0,
            internal_with_target: internalOccurrences.length,
            audits_created: finalLinkAudits.length,
            audits_inserted: auditsInserted,
            audits_returned_to_client: finalLinkAudits.length,
            sample_occurrence_ids_input: internalOccurrences.slice(0, 5).map((occ) => occ.id),
            sample_occurrence_ids_output: finalLinkAudits.slice(0, 5).map((audit) => audit.occurrence_id),
        });
        const graphSnapshot = buildGraphSnapshotForClient();

        return {
            success: true,
            message: aiStatus === "success" ? "Auditoria inteligente concluida!" : "Auditoria padrao concluida.",
            aiStatus,
            linkAudits: finalLinkAudits.map((audit) => ({
                occurrenceId: audit.occurrence_id,
                occurrence_id: audit.occurrence_id,
                source_post_id: audit.source_post_id ?? null,
                target_post_id: audit.target_post_id ?? null,
                score: audit.score,
                label: audit.label,
                reasons: audit.reasons,
                suggested_anchor: audit.suggested_anchor,
                note: audit.note,
                action: audit.action,
                recommendation: audit.recommendation,
                spam_risk: audit.spam_risk,
                intent_match: audit.intent_match,
            })),
            occurrences: graphSnapshot.occurrences,
            linkEdges: graphSnapshot.linkEdges,
            siloAudit: siloAuditPayload,
        };
    } catch (error: any) {
        console.error("Critical Audit Error:", error);
        return { success: false, message: error.message };
    }
}
