import * as cheerio from "cheerio";
import crypto from "crypto";
import { getAdminDatabase } from "@/lib/database";

type SyncContext = {
    posts?: Array<{ id: string; slug?: string | null; canonical_path?: string | null }>;
    siloSlug?: string | null;
    siteUrl?: string | null;
};

type LinkOccurrence = {
    id?: string;
    silo_id: string;
    source_post_id: string;
    target_post_id: string | null;
    anchor_text: string;
    context_snippet: string | null;
    start_index?: number | null;
    end_index?: number | null;
    occurrence_key?: string | null;
    href_normalized: string;
    position_bucket: "START" | "MID" | "END";
    link_type: "INTERNAL" | "EXTERNAL" | "AFFILIATE";
    is_nofollow: boolean;
    is_sponsored: boolean;
    is_ugc: boolean;
    is_blank: boolean;
};

const AMAZON_HOST_HINTS = ["amazon.", "amzn.to", "a.co"];
const IGNORE_PREFIXES = ["mailto:", "tel:", "javascript:"];

const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/^www\./, "");

const normalizePath = (path: string) => {
    if (!path) return null;
    const cleaned = path.trim().split("#")[0].split("?")[0];
    if (!cleaned) return null;
    let normalized = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    if (normalized.length > 1 && normalized.endsWith("/")) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
};

const getSiteHost = (siteUrl?: string | null) => {
    if (!siteUrl) return null;
    try {
        return normalizeHost(new URL(siteUrl).hostname);
    } catch {
        return null;
    }
};

const getBasePath = (siteUrl?: string | null) => {
    if (!siteUrl) return null;
    try {
        const pathname = new URL(siteUrl).pathname;
        const normalized = normalizePath(pathname);
        if (!normalized || normalized === "/") return null;
        return normalized;
    } catch {
        return null;
    }
};

const safeHref = (href?: string | null) => {
    if (!href) return null;
    const trimmed = href.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("#")) return null;
    if (IGNORE_PREFIXES.some((prefix) => lower.startsWith(prefix))) return null;
    return trimmed;
};

const normalizeSlug = (s: string) => s.replace(/^\/+|\/+$/g, "").toLowerCase();

const stripLocalePrefix = (path: string) => {
    if (!path) return null;
    const trimmed = path.replace(/^\/+|\/+$/g, "");
    if (!trimmed) return path;
    const parts = trimmed.split("/");
    const first = parts[0]?.toLowerCase() ?? "";
    if (/^[a-z]{2}(-[a-z]{2})?$/.test(first)) {
        const rest = parts.slice(1).join("/");
        return rest ? `/${rest}` : "/";
    }
    return path;
};

const stripBasePath = (path: string, basePath: string | null) => {
    if (!path || !basePath) return path;
    if (basePath === "/") return path;
    if (path === basePath) return "/";
    if (path.startsWith(`${basePath}/`)) {
        return path.slice(basePath.length) || "/";
    }
    return path;
};

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

function generateOccurrenceId() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    const bytes = crypto.randomBytes(16);
    // RFC4122 v4 fallback for runtimes without randomUUID.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function resolveHref(href: string, siteHost: string | null) {
    const trimmed = href.trim();
    let normalizedHref = trimmed.split("#")[0].split("?")[0] || trimmed;
    let path: string | null = null;
    let isSameHost = false;
    let isRelative = false;
    let isAmazon = false;

    if (trimmed.startsWith("//")) {
        try {
            const url = new URL(`https:${trimmed}`);
            const host = normalizeHost(url.hostname);
            isAmazon = AMAZON_HOST_HINTS.some((hint) => host.includes(hint));
            isSameHost = siteHost ? host === siteHost : false;
            path = normalizePath(url.pathname);
            normalizedHref = `${url.origin}${path ?? ""}`;
            return { normalizedHref, path, isSameHost, isRelative, isAmazon };
        } catch {
            return { normalizedHref, path, isSameHost, isRelative, isAmazon };
        }
    }

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed);
            const host = normalizeHost(url.hostname);
            isAmazon = AMAZON_HOST_HINTS.some((hint) => host.includes(hint));
            isSameHost = siteHost ? host === siteHost : false;
            path = normalizePath(url.pathname);
            normalizedHref = `${url.origin}${path ?? ""}`;
            return { normalizedHref, path, isSameHost, isRelative, isAmazon };
        } catch {
            return { normalizedHref, path, isSameHost, isRelative, isAmazon };
        }
    }

    isRelative = true;
    path = normalizePath(trimmed);
    normalizedHref = path ?? normalizedHref;
    return { normalizedHref, path, isSameHost: true, isRelative, isAmazon: false };
}

function resolveTargetPostId(
    path: string | null,
    ctx: { postPathMap: Map<string, string>; slugMap: Map<string, string>; siloSlug: string | null; basePath?: string | null }
) {
    if (!path) return { targetPostId: null as string | null, matchedPath: null as string | null };
    const normalized = normalizePath(path);
    if (!normalized) return { targetPostId: null, matchedPath: null };

    const candidates = new Set<string>();
    const push = (value: string | null) => {
        if (!value) return;
        candidates.add(value);
    };

    push(normalized);
    const withoutBase = stripBasePath(normalized, ctx.basePath ?? null);
    push(withoutBase);
    push(stripLocalePrefix(normalized));
    if (withoutBase) push(stripLocalePrefix(withoutBase));

    for (const candidate of candidates) {
        const direct = ctx.postPathMap.get(candidate);
        if (direct) return { targetPostId: direct, matchedPath: candidate };
    }

    const siloSlug = ctx.siloSlug?.toLowerCase() ?? null;
    for (const candidate of candidates) {
        const trimmed = candidate.replace(/^\/+|\/+$/g, "");
        if (!trimmed) continue;
        const parts = trimmed.split("/");
        if (siloSlug && parts.length >= 2 && parts[0]?.toLowerCase() === siloSlug) {
            const slug = normalizeSlug(parts[1]);
            const id = ctx.slugMap.get(slug);
            if (id) return { targetPostId: id, matchedPath: candidate };
        } else if (!siloSlug && parts.length === 1) {
            const slug = normalizeSlug(parts[0]);
            const id = ctx.slugMap.get(slug);
            if (id) return { targetPostId: id, matchedPath: candidate };
        }
    }

    // Fallback: ignore silo prefix mismatches and match by last segment
    for (const candidate of candidates) {
        const trimmed = candidate.replace(/^\/+|\/+$/g, "");
        if (!trimmed) continue;
        const parts = trimmed.split("/");
        if (parts.length < 2) continue;
        const possibleSlug = normalizeSlug(parts[parts.length - 1]);
        const id = ctx.slugMap.get(possibleSlug);
        if (id) return { targetPostId: id, matchedPath: candidate };
    }

    return { targetPostId: null, matchedPath: null };
}

function classifyLink(
    href: string,
    ctx: {
        siteHost: string | null;
        postPathMap: Map<string, string>;
        slugMap: Map<string, string>;
        siloSlug: string | null;
        basePath?: string | null;
    }
) {
    const resolved = resolveHref(href, ctx.siteHost);
    const internalCandidate = resolved.isRelative || resolved.isSameHost;
    const target = internalCandidate
        ? resolveTargetPostId(resolved.path, {
            postPathMap: ctx.postPathMap,
            slugMap: ctx.slugMap,
            siloSlug: ctx.siloSlug ?? null,
            basePath: ctx.basePath ?? null,
        })
        : { targetPostId: null, matchedPath: null };

    const type: "INTERNAL" | "EXTERNAL" | "AFFILIATE" = resolved.isAmazon
        ? "AFFILIATE"
        : internalCandidate
            ? "INTERNAL"
            : "EXTERNAL";

    const normalizedUrl = target.matchedPath ?? resolved.normalizedHref;
    return { type, normalizedUrl, targetPostId: target.targetPostId };
}

export async function syncLinkOccurrences(
    siloId: string,
    sourcePostId: string,
    htmlContent: string,
    options: SyncContext = {}
) {
    if (!siloId || !sourcePostId) return;

    const database = getAdminDatabase();
    const siteUrl = options.siteUrl ?? process.env.SITE_URL ?? "http://localhost:3000";
    const siteHost = getSiteHost(siteUrl);
    const basePath = getBasePath(siteUrl);

    // 1. Load posts to resolve internal links
    let posts = options.posts;
    if (!posts) {
        const { data: fetched, error } = await database
            .from("posts")
            .select("id, slug, canonical_path")
            .eq("silo_id", siloId);

        if (error) {
            const fallback = await database
                .from("posts")
                .select("id, slug")
                .eq("silo_id", siloId);
            if (fallback.error) {
                console.error("Erro ao buscar posts para syncLinkOccurrences", error);
                return;
            }
            posts = (fallback.data ?? []) as NonNullable<typeof options.posts>;
        } else {
            posts = (fetched ?? []) as NonNullable<typeof options.posts>;
        }
    }

    let siloSlug = options.siloSlug ?? null;
    if (!siloSlug) {
        const { data: siloData, error: siloError } = await database
            .from("silos")
            .select("slug")
            .eq("id", siloId)
            .maybeSingle();
        if (!siloError) {
            siloSlug = siloData?.slug ?? null;
        }
    }

    const slugMap = new Map<string, string>();
    const postPathMap = new Map<string, string>();
    (posts ?? []).forEach((p: any) => {
        if (p.slug) slugMap.set(normalizeSlug(p.slug), p.id);
        if (p.canonical_path) {
            const canonical = normalizePath(String(p.canonical_path));
            if (canonical) postPathMap.set(canonical, p.id);
        }
        if (p.slug && siloSlug) {
            const mainPath = normalizePath(`/${siloSlug}/${p.slug}`);
            if (mainPath) postPathMap.set(mainPath, p.id);
        }
    });

    // 2. Parse HTML
    const $ = cheerio.load(htmlContent ?? "");
    const $links = $("a");
    const occurrences: LinkOccurrence[] = [];
    const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();
    const fullText = normalizeText($.root().text());
    let searchCursor = 0;

    // Limit processing to avoid slowdowns on huge posts
    const MAX_LINKS = 200;

    $links.slice(0, MAX_LINKS).each((i, el) => {
        const $el = $(el);
        const href = safeHref($el.attr("href"));
        let anchorText = $el.text().replace(/\s+/g, " ").trim();
        if (!anchorText && $el.find("img").length > 0) anchorText = "[Imagem]";
        if (!anchorText) anchorText = "[Sem texto]";

        if (!href) return;

        // Attributes
        const rel = ($el.attr("rel") || "").toLowerCase();
        const target = $el.attr("target") || "";
        let is_nofollow = rel.includes("nofollow");
        let is_sponsored = rel.includes("sponsored");
        let is_ugc = rel.includes("ugc");
        let is_blank = target === "_blank";

        const classification = classifyLink(href, {
            siteHost,
            postPathMap,
            slugMap,
            siloSlug,
            basePath,
        });
        const link_type = classification.type;
        const targetPostId = classification.targetPostId ?? null;
        const normalizedHref = classification.normalizedUrl || href;

        if (link_type === "INTERNAL") {
            is_nofollow = false;
            is_sponsored = false;
            is_ugc = false;
        }
        if (link_type === "AFFILIATE") {
            is_sponsored = true;
            is_nofollow = true;
            is_blank = true;
        }

        // Context Snippet
        const contextText = $el.parent().text().replace(/\s+/g, " ");
        const snippet = contextText.substring(0, 200);

        // Start/End index (approx by normalized full text)
        const anchorNorm = normalizeText(anchorText);
        let start_index: number | null = null;
        let end_index: number | null = null;
        if (anchorNorm) {
            const foundIndex = fullText.indexOf(anchorNorm, searchCursor);
            if (foundIndex >= 0) {
                start_index = foundIndex;
                end_index = foundIndex + anchorNorm.length;
                searchCursor = end_index;
            }
        }

        const occurrence_key = crypto
            .createHash("sha1")
            .update(`${anchorNorm}|${href}|${snippet}`)
            .digest("hex");

        // Position Bucket
        const bucket = i < $links.length / 3 ? "START" : i < ($links.length * 2) / 3 ? "MID" : "END";

        occurrences.push({
            silo_id: siloId,
            source_post_id: sourcePostId,
            target_post_id: targetPostId,
            anchor_text: anchorText.substring(0, 255),
            context_snippet: snippet,
            start_index,
            end_index,
            occurrence_key,
            href_normalized: normalizedHref.substring(0, 500),
            position_bucket: bucket,
            link_type,
            is_nofollow,
            is_sponsored,
            is_ugc,
            is_blank,
        });
    });

    // 3. Persist (preserve IDs using occurrence_key when available)
    let existingSelect = "id, occurrence_key, target_post_id";
    let existingOccurrences: any[] | null = null;
    let hasOccurrenceKey = true;
    let existingError: any = null;

    const loadExisting = async (select: string) => {
        return database
            .from("post_link_occurrences")
            .select(select)
            .eq("silo_id", siloId)
            .eq("source_post_id", sourcePostId);
    };

    {
        const { data, error } = await loadExisting(existingSelect);
        existingOccurrences = data ?? null;
        existingError = error;
    }

    if (existingError) {
        const missing = getMissingColumnFromError(existingError);
        if (missing === "occurrence_key") {
            hasOccurrenceKey = false;
            existingSelect = "id, target_post_id, anchor_text, href_normalized, context_snippet";
            const { data, error } = await loadExisting(existingSelect);
            existingOccurrences = data ?? null;
            existingError = error;
        }
    }

    if (existingError) {
        logDbError("Erro ao buscar ocorrencias antigas", existingError);
    }

    const existingByKey = new Map<string, Array<{ id: string; target_post_id: string | null }>>();
    const existingIds = new Set<string>();
    (existingOccurrences ?? []).forEach((row: any) => {
        if (!row.id) return;
        existingIds.add(String(row.id));
        let key = row.occurrence_key ?? "";
        if (!hasOccurrenceKey) {
            key = `${row.anchor_text ?? ""}|${row.href_normalized ?? ""}|${row.context_snippet ?? ""}`;
        }
        if (!key) return;
        const list = existingByKey.get(key) ?? [];
        list.push({ id: String(row.id), target_post_id: row.target_post_id ?? null });
        existingByKey.set(key, list);
    });

    const matchedIds = new Set<string>();
    const syncTimestamp = new Date().toISOString();
    const mergedOccurrences = occurrences.map((occ) => {
        const key = hasOccurrenceKey
            ? occ.occurrence_key ?? ""
            : `${occ.anchor_text ?? ""}|${occ.href_normalized ?? ""}|${occ.context_snippet ?? ""}`;
        const list = key ? existingByKey.get(key) : null;
        const existing = list && list.length > 0 ? list.shift() : null;
        if (existing?.id) matchedIds.add(existing.id);

        const keepTarget = occ.target_post_id ? occ.target_post_id : existing?.target_post_id ?? null;
        if (existing?.id) {
            return {
                ...occ,
                id: existing.id,
                target_post_id: keepTarget,
                link_type: keepTarget ? "INTERNAL" : occ.link_type,
                updated_at: syncTimestamp,
            };
        }

        return { ...occ, id: generateOccurrenceId(), target_post_id: keepTarget, updated_at: syncTimestamp };
    });

    const idsToDelete = Array.from(existingIds).filter((id) => !matchedIds.has(id));
    if (idsToDelete.length > 0) {
        const { error: delError } = await database
            .from("post_link_occurrences")
            .delete()
            .in("id", idsToDelete);
        if (delError) {
            logDbError("Erro ao limpar ocorrencias antigas", delError);
        }
    }

    if (mergedOccurrences.length > 0) {
        let payload: any[] = mergedOccurrences;
        let lastError: any = null;
        for (let attempt = 0; attempt < 6; attempt += 1) {
            const { error: upsertError } = await database
                .from("post_link_occurrences")
                .upsert(payload, { onConflict: "id" });

            if (!upsertError) {
                lastError = null;
                break;
            }

            lastError = upsertError;
            const missing = getMissingColumnFromError(upsertError);
            if (!missing) break;
            payload = payload.map((row) => {
                const { [missing]: _, ...rest } = row;
                return rest;
            });
        }

        if (lastError) {
            logDbError("Erro ao inserir novas ocorrencias", lastError);
        }
    }
}
