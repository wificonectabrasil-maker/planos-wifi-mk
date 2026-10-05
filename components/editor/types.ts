"use client";

export type ImageAsset = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  fileName?: string;
  createdAt?: string;
  kind?: "hero" | "og" | "body" | "visual-plan";
  status?: "uploaded" | "needs_asset" | "inserted";
  placement?: string;
  sectionHeading?: string;
  prompt?: string;
  caption?: string;
  visualPurpose?: string;
  aspectRatio?: string;
  source?: "upload" | "visual-plan";
};

export type SourceItem = {
  label: string;
  url: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type HowToItem = {
  name: string;
  text: string;
};

export type EditorMeta = {
  title: string;
  metaTitle: string;
  slug: string;
  targetKeyword: string;
  metaDescription: string;
  supportingKeywords: string[];
  entities: string[];
  schemaType: "article" | "review" | "faq" | "howto";
  status: "draft" | "review" | "scheduled" | "published";
  scheduledAt: string;
  canonicalPath: string;
  heroImageUrl: string;
  heroImageAlt: string;
  ogImageUrl: string;
  images: ImageAsset[];
  authorName: string;
  expertName: string;
  expertRole: string;
  expertBio: string;
  expertCredentials: string;
  reviewedBy: string;
  reviewedAt: string;
  authorLinks: string[];
  sources: SourceItem[];
  faq: FaqItem[];
  howto: HowToItem[];
  siloId: string;
  siloRole?: "PILLAR" | "SUPPORT" | "AUX";
  siloPosition?: number;
  siloOrder?: number;
  showInSiloMenu?: boolean;
  replaceExistingPillar?: boolean;
  amazonProducts: any[];
};

export type OutlineItem = {
  id: string;
  level: 2 | 3 | 4;
  text: string;
  pos: number;
};

export type LinkItem = {
  id: string;
  href: string;
  text: string;
  type: "internal" | "external" | "affiliate" | "about" | "mention";
  target?: string | null;
  rel?: string | null;
  from: number;
  to: number;
  dataPostId?: string | null;
  dataEntityType?: string | null;
};
