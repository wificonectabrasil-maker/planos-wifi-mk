import { socialContexts } from "./social";
import type { Metadata } from "next";
export function telecomMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const context = path === "/" ? "inicio" : path.slice(1);
  const image = Object.hasOwn(socialContexts, context) ? "/social/" + context : "/opengraph-image";
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      locale: "pt_BR",
      siteName: "WifiConecta",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
