import { loadMediaMetadata, loadMediaBytes } from "@/lib/media/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };

async function serve(request: Request, context: Context, head: boolean) {
  const path = (await context.params).path.join("/");
  const media = await loadMediaMetadata(path);
  if (!media) return new Response(null, { status: 404 });
  const etag = `"${media.sha256}"`;
  const headers = {
    "Content-Type": String(media.content_type),
    "Content-Length": String(media.byte_length),
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": headers["Cache-Control"] },
    });
  if (head) return new Response(null, { headers });
  const bytes = await loadMediaBytes(String(media.id));
  if (bytes.length !== Number(media.byte_length))
    throw new Error("Arquivo de mídia incompleto.");
  return new Response(bytes.buffer as ArrayBuffer, { headers });
}
export async function GET(request: Request, context: Context) {
  return serve(request, context, false);
}
export async function HEAD(request: Request, context: Context) {
  return serve(request, context, true);
}
