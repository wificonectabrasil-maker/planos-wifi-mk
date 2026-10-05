import { NextResponse } from "next/server";
import { storeMedia } from "@/lib/media/storage";
import { isAdminSession } from "@/lib/admin/auth";
import sharp from "sharp";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/** Largura máxima por tipo de imagem (px) */
const MAX_WIDTH: Record<string, number> = {
  hero: 1200,
  cover: 1200,
  body: 1600,
};
const DEFAULT_MAX_WIDTH = 1600;

/** Qualidade WebP (mesmo padrão que o usuário já usa) */
const WEBP_QUALITY = 75;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sanitizeSegment(value: string, fallback: string) {
  const cleaned = slugify(value);
  return cleaned || fallback;
}

/**
 * Otimiza a imagem com sharp:
 * - Converte qualquer formato (png/jpg/webp) → webp
 * - Redimensiona se exceder largura máxima (mantém proporção)
 * - Comprime com qualidade 75
 * Retorna { buffer, width, height, originalSize, optimizedSize }
 */
async function optimizeImage(input: Buffer, kind: string) {
  const originalSize = input.length;
  const maxW = MAX_WIDTH[kind] ?? DEFAULT_MAX_WIDTH;

  let pipeline = sharp(input).rotate(); // auto-rotate EXIF

  const metadata = await sharp(input).metadata();
  const srcWidth = metadata.width ?? 0;
  const srcHeight = metadata.height ?? 0;

  // Redimensiona apenas se ultrapassar o limite
  if (srcWidth > maxW) {
    pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true });
  }

  const optimized = await pipeline
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: optimized.data,
    width: optimized.info.width,
    height: optimized.info.height,
    originalSize,
    optimizedSize: optimized.data.length,
  };
}

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const postId = String(formData.get("postId") ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "") || "misc";
  const siloSlug = sanitizeSegment(String(formData.get("siloSlug") ?? ""), "silo");
  const altRaw = String(formData.get("alt") ?? "");
  const kind = String(formData.get("kind") ?? "body");

  if (!file || typeof (file as any).arrayBuffer !== "function") {
    return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 });
  }

  const blob = file as Blob;
  const contentType = String((blob as any).type ?? "");
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Tipo de imagem nao permitido." }, { status: 400 });
  }

  const maxBytes = Math.max(1, Number(process.env.ADMIN_UPLOAD_MAX_MB ?? 6)) * 1024 * 1024;
  if (blob.size > maxBytes) {
    return NextResponse.json({ error: "Arquivo acima do limite." }, { status: 400 });
  }

  // Otimiza com sharp → sempre sai como .webp
  const rawBuffer = Buffer.from(await blob.arrayBuffer());
  const { buffer, width, height, originalSize, optimizedSize } = await optimizeImage(rawBuffer, kind);

  const savedPercent = Math.round((1 - optimizedSize / originalSize) * 100);
  console.log(
    `[upload] sharp: ${(originalSize / 1024).toFixed(0)}KB → ${(optimizedSize / 1024).toFixed(0)}KB (−${savedPercent}%) | ${width}×${height} | kind=${kind}`,
  );

  const timestamp = Date.now();
  const altSlug = sanitizeSegment(altRaw, "imagem");
  const fileName =
    kind === "hero"
      ? `hero-${timestamp}.webp`
      : `${timestamp}-${altSlug}.webp`;
  // Use postId as stable media folder to avoid broken URLs when slug changes.
  const path = `${siloSlug}/${postId}/${fileName}`;

  let media;
  try { media = await storeMedia(path, buffer, "image/webp"); }
  catch { return NextResponse.json({ error: "Não foi possível armazenar a imagem." }, { status: 500 }); }
  return NextResponse.json({
    url: media.url,
    fileName,
    width,
    height,
    originalSizeKB: Math.round(originalSize / 1024),
    optimizedSizeKB: Math.round(optimizedSize / 1024),
    savedPercent,
    createdAt: new Date().toISOString(),
  });
}
