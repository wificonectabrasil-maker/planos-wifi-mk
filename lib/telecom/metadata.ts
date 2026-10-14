import { socialContexts } from "./social";
import type { Metadata } from "next";
import { resolveSiteUrl } from "@/lib/site/url";
import { staticPageCopy, type StaticPagePath } from "./static-page-copy";
export function telecomMetadata(
  title: string,
  description: string,
  path: string,
  social?: { title: string; description: string; twitterTitle: string },
): Metadata {
  const context = path === "/" ? "inicio" : path.slice(1);
  const image = Object.hasOwn(socialContexts, context) ? "/social/" + context : "/opengraph-image";
  const socialTitle = social?.title ?? title;
  const socialDescription = social?.description ?? description;
  const imageAlt = socialContexts[context]?.title ?? "WifiConecta — atendimento humano para consultar internet";
  const imageUrl = `${resolveSiteUrl()}${image}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      url: path,
      type: "website",
      locale: "pt_BR",
      siteName: "WifiConecta",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: social?.twitterTitle ?? socialTitle,
      description: socialDescription,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
  };
}

export function staticPageMetadata(path: StaticPagePath): Metadata {
  const copy = staticPageCopy[path];
  return {
    ...telecomMetadata(copy.title, copy.description, path, {
      title: copy.socialTitle, description: copy.socialDescription, twitterTitle: copy.twitterTitle,
    }),
    // The root layout appends the brand to string titles; these are already complete.
    title: { absolute: copy.title },
  };
}
