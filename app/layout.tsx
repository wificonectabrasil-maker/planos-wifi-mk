import type { Metadata } from "next";

import "./globals.css";
import "./wificonecta.css";
import { SiteChrome } from "@/components/site/SiteChrome";
import type { SiteHeaderLink } from "@/components/site/SiteHeader";
import { getPublicPostsBySilo, getPublicSiloGroupsBySiloId, getPublicSilos } from "@/lib/db";
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME, SITE_WHATSAPP_PHONE } from "@/lib/site";
import { resolveSiteUrl } from "@/lib/site/url";
import { resolveWhatsAppPhone } from "@/lib/telecom/whatsapp";
import { normalizeSiloGroup } from "@/lib/silo/groups";
import type { Post, SiloGroup } from "@/lib/types";

const body = { variable: "" };

const ogLocale = SITE_LOCALE.replace("-", "_");
const twitterSite = process.env.NEXT_PUBLIC_TWITTER_SITE?.trim() || undefined;
const siteUrl = resolveSiteUrl();
const defaultSocialImage = "/opengraph-image";
const isPreviewDeployment = process.env.VERCEL_ENV === "preview";
const allowIndexing = !isPreviewDeployment && process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteUrl,
    locale: ogLocale,
    images: [defaultSocialImage],
  },
  twitter: {
    card: "summary_large_image",
    site: twitterSite,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [defaultSocialImage],
  },
  robots: allowIndexing
    ? {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    }
    : {
      index: false,
      follow: false,
      nocache: true,
    },
};

function buildHeaderLinksFromSilos(siloLinks: SiteHeaderLink[]): SiteHeaderLink[] {
  const links: SiteHeaderLink[] = [
    { href: "/", label: "Home" },
    ...siloLinks,
    { href: "/sobre", label: "Sobre" },
    { href: "/contato", label: "Contato" },
  ];
  const seen = new Set<string>();
  return links.filter((link) => {
    if (!link.href || seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function normalizeRole(value: unknown): "PILLAR" | "SUPPORT" | "AUX" | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "PILLAR" || normalized === "SUPPORT" || normalized === "AUX") return normalized;
  return null;
}

function normalizeOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function buildSiloSubmenu(siloSlug: string, posts: Post[], groups: SiloGroup[]): SiteHeaderLink["submenu"] {
  const groupByKey = new Map(
    (groups ?? [])
      .filter((group) => normalizeSiloGroup(group.key))
      .map((group) => [String(group.key), { label: group.label, order: normalizeOrder(group.menu_order) }])
  );

  type MenuPost = {
    label: string;
    href: string;
    role: "PILLAR" | "SUPPORT" | "AUX" | null;
    groupKey: string | null;
    order: number;
    visible: boolean;
  };

  const menuPosts: MenuPost[] = (posts ?? [])
    .map((post) => {
      const role = normalizeRole(post.silo_role);
      const groupKey = role === "PILLAR" || role === "AUX" ? null : normalizeSiloGroup(post.silo_group);
      const order = normalizeOrder(
        typeof post.silo_order === "number" ? post.silo_order : post.silo_group_order
      );
      return {
        label: post.title,
        href: `/${siloSlug}/${post.slug}`,
        role,
        groupKey,
        order,
        visible: role === "PILLAR" ? true : role === "AUX" ? false : post.show_in_silo_menu !== false,
      };
    })
    .filter((post) => post.visible && Boolean(post.label && post.href));

  if (menuPosts.length === 0) return undefined;

  const sortByOrderThenTitle = (a: MenuPost, b: MenuPost) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.label.localeCompare(b.label, "pt-BR");
  };

  const submenu: NonNullable<SiteHeaderLink["submenu"]> = [];

  const pillarItems = menuPosts
    .filter((post) => post.role === "PILLAR")
    .sort(sortByOrderThenTitle)
    .map((post) => ({ href: post.href, label: post.label }));
  if (pillarItems.length > 0) {
    submenu.push({ label: "Comece por aqui", items: pillarItems });
  }

  const groupedByGroup = new Map<string, MenuPost[]>();
  for (const post of menuPosts) {
    if (post.role === "PILLAR") continue;
    if (!post.groupKey) continue;
    if (!groupedByGroup.has(post.groupKey)) groupedByGroup.set(post.groupKey, []);
    groupedByGroup.get(post.groupKey)!.push(post);
  }

  const sortedGroupEntries = Array.from(groupedByGroup.entries()).sort((a, b) => {
    const groupA = groupByKey.get(a[0]);
    const groupB = groupByKey.get(b[0]);
    const orderA = groupA?.order ?? 999;
    const orderB = groupB?.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    const labelA = groupA?.label ?? a[0];
    const labelB = groupB?.label ?? b[0];
    return labelA.localeCompare(labelB, "pt-BR");
  });

  for (const [groupKey, items] of sortedGroupEntries) {
    submenu.push({
      label: groupByKey.get(groupKey)?.label ?? "Outros",
      items: items.sort(sortByOrderThenTitle).map((post) => ({ href: post.href, label: post.label })),
    });
  }

  const ungroupedItems = menuPosts
    .filter((post) => post.role !== "PILLAR" && !post.groupKey)
    .sort(sortByOrderThenTitle)
    .map((post) => ({ href: post.href, label: post.label }));
  if (ungroupedItems.length > 0) {
    submenu.push({ label: "Outros", items: ungroupedItems });
  }

  return submenu.length > 0 ? submenu : undefined;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let headerLinks: SiteHeaderLink[] = [
    { href: "/", label: "Home" },
    { href: "/sobre", label: "Sobre" },
    { href: "/contato", label: "Contato" },
  ];

  try {
    const silos = await getPublicSilos();
    const siloLinks = await Promise.all(
      silos
        .filter((silo) => silo.is_active !== false && silo.show_in_navigation !== false && Boolean(silo.slug))
        .map(async (silo) => {
          try {
            const [posts, groups] = await Promise.all([
              getPublicPostsBySilo(silo.slug),
              getPublicSiloGroupsBySiloId(silo.id).catch(() => []),
            ]);
            if (posts.length === 0) return null;
            return {
              href: `/${silo.slug}`,
              label: silo.name,
              submenu: buildSiloSubmenu(silo.slug, posts, groups),
            } as SiteHeaderLink;
          } catch (submenuError) {
            console.error("[SITE] failed to build silo submenu", { siloSlug: silo.slug, submenuError });
            return {
              href: `/${silo.slug}`,
              label: silo.name,
            } as SiteHeaderLink;
          }
        })
    );
    headerLinks = buildHeaderLinksFromSilos(siloLinks.filter(Boolean) as SiteHeaderLink[]);
  } catch (error) {
    console.error("[SITE] failed to load public silos for header", error instanceof Error ? error.message : error);
  }

  return (
    <html lang={SITE_LOCALE}>
      <body className={`${body.variable} min-h-screen`}>
        <SiteChrome
          headerLinks={headerLinks}
          whatsappPhone={resolveWhatsAppPhone(process.env.WIFICONECTA_WHATSAPP, SITE_WHATSAPP_PHONE)}
        >
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
