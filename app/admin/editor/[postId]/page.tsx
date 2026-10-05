import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetPostById, adminListSilos } from "@/lib/db";
import { AdvancedEditor } from "@/components/editor/AdvancedEditor";
import { extractContentorCtas } from "@/lib/editor/contentorMeta";
import { isUuid } from "@/lib/uuid";

export const revalidate = 0;

function hasCtaButton(doc: any) {
  if (!doc) return false;
  let found = false;
  let hasMissingHref = false;
  const walk = (node: any) => {
    if (!node || found) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.type === "cta_button") {
      found = true;
      if (!node.attrs?.href) hasMissingHref = true;
      return;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  };
  walk(doc);
  return found && !hasMissingHref;
}

function countDocNodes(doc: any, targetType: string) {
  if (!doc) return 0;
  let total = 0;
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.type === targetType) total += 1;
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(doc);
  return total;
}

function countCtaActionsInHtml(html: string) {
  if (!html) return 0;
  const matches = html.match(
    /<(?:button|a)\b[^>]*>\s*(?:ver pre(?:c|ç)o|verificar disponibilidade|compre agora|ver oferta)\s*<\/(?:button|a)>/gi
  );
  return matches?.length ?? 0;
}

function stripHtmlToText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getDocTextLength(doc: any) {
  if (!doc) return 0;
  let text = "";
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node.text === "string") text += ` ${node.text}`;
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(doc);
  return text.trim().length;
}

export default async function EditorPage({ params }: { params: Promise<{ postId: string }> }) {
  await requireAdminSession();
  const { postId } = await params;
  if (!isUuid(postId)) return notFound();
  const [post, silos] = await Promise.all([adminGetPostById(postId), adminListSilos()]);

  if (!post) return notFound();

  let hydratedPost = post;
  const rawPayloadContent =
    typeof post.raw_payload?.content === "string"
      ? post.raw_payload.content
      : typeof post.raw_payload?.content?.raw === "string"
        ? post.raw_payload.content.raw
        : typeof post.raw_payload?.content?.rendered === "string"
          ? post.raw_payload.content.rendered
          : null;
  const contentSource = rawPayloadContent || post.content_html;
  const hasLinkCandidateTokens = typeof contentSource === "string" && contentSource.includes("[[LINK_CANDIDATE");
  const hasCtaLabels =
    typeof contentSource === "string" &&
    /(compre agora|verificar disponibilidade|ver pre(c|ç)o|ver oferta)/i.test(contentSource);
  const sourceCtaCount = typeof contentSource === "string" ? countCtaActionsInHtml(contentSource) : 0;
  const docCtaCount = countDocNodes(post.content_json, "cta_button");
  const sourceTextLen = typeof contentSource === "string" ? stripHtmlToText(contentSource).length : 0;
  const docTextLen = getDocTextLength(post.content_json);
  const hasLikelyTextLoss =
    hasCtaLabels && sourceTextLen >= 1200 && docTextLen > 0 && docTextLen / sourceTextLen < 0.55;
  const hasLikelyCollapsedCtaImport = (sourceCtaCount >= 2 && docCtaCount <= 1) || hasLikelyTextLoss;
  const contentJsonMeta = (post.content_json as any)?.meta ?? {};
  const hasManualEdits = Boolean(contentJsonMeta.manualEdits || contentJsonMeta.manual_edits);
  const needsReimport = Boolean(
    post.content_html &&
      !hasManualEdits &&
      (!post.content_json ||
        hasLinkCandidateTokens ||
        (hasCtaLabels && !hasCtaButton(post.content_json)) ||
        hasLikelyCollapsedCtaImport)
  );

  if (needsReimport && contentSource) {
    const { importContentorHtml } = await import("@/lib/editor/contentorImport");
    const ctas = extractContentorCtas(post.raw_payload);
    const importResult = importContentorHtml(contentSource, { ctas });
    if (process.env.DEBUG_CONTENTOR_IMPORT === "1") {
      console.info("[contentor] CTA stats (editor hydration)", importResult.stats);
    }
    const shouldReplaceTitle = importResult.title && (!post.title || post.title === "Sem título");
    hydratedPost = {
      ...post,
      title: shouldReplaceTitle ? importResult.title ?? post.title : post.title,
      content_json: importResult.doc,
      content_html: importResult.html || post.content_html,
    };
  }

  return <AdvancedEditor post={hydratedPost} silos={silos} />;
}

