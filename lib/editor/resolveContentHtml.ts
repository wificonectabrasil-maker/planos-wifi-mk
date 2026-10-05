import { renderEditorDocToHtml } from "@/lib/editor/docRenderer";

type ContentSource = {
  content_json?: any;
  content_html?: string | null;
};

function stripHtmlToText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function resolveContentHtmlForRender(source: ContentSource): string {
  const contentHtmlFromJson = source.content_json ? renderEditorDocToHtml(source.content_json) : "";
  const storedHtml = source.content_html || "";

  const jsonHasImg = /<img\b/i.test(contentHtmlFromJson);
  const storedHasImg = /<img\b/i.test(storedHtml);
  const jsonHasCtaColor = /data-bg-color="[^"]+"/i.test(contentHtmlFromJson);
  const storedHasCtaColor = /data-bg-color="[^"]+"/i.test(storedHtml);

  const jsonTextLen = stripHtmlToText(contentHtmlFromJson).length;
  const storedTextLen = stripHtmlToText(storedHtml).length;
  const hasLikelyTextLoss = storedTextLen >= 1200 && jsonTextLen > 0 && jsonTextLen / storedTextLen < 0.7;

  const shouldFallbackToStored =
    (!jsonHasImg && storedHasImg) || (!jsonHasCtaColor && storedHasCtaColor) || hasLikelyTextLoss;

  return shouldFallbackToStored ? storedHtml : contentHtmlFromJson || storedHtml;
}
