export function localMediaPath(source: string, siteUrl: string): string {
  if (source.startsWith("/media/")) return source;
  try {
    const url = new URL(source),
      site = new URL(siteUrl);
    if (url.origin === site.origin && url.pathname.startsWith("/media/"))
      return url.pathname;
  } catch {
    /* Keep external images unchanged. */
  }
  return source;
}
