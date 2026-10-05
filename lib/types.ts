export type Silo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  pillar_content_json?: any | null;
  pillar_content_html?: string | null;
  menu_order?: number | null;
  is_active?: boolean | null;
  show_in_navigation?: boolean | null;
  created_at: string;
};

export type SiloGroup = {
  id: string;
  silo_id: string;
  key: string;
  label: string;
  menu_order?: number | null;
  keywords?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Post = {
  id: string;
  silo_id: string | null;
  title: string;
  seo_title?: string | null;
  meta_title?: string | null;
  slug: string;
  target_keyword: string;
  focus_keyword?: string | null;
  content_json: any | null;
  content_html: string | null;
  seo_score: number | null;
  supporting_keywords: string[] | null;
  meta_description: string | null;
  excerpt?: string | null;
  canonical_path?: string | null;
  entities?: string[] | null;
  faq_json?: any | null;
  howto_json?: any | null;
  schema_type?: "article" | "review" | "faq" | "howto" | null;
  cover_image?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  og_image_url?: string | null;
  images?: any[] | null;
  intent?: "commercial" | "transactional" | "informational" | null | string;
  pillar_rank?: number | null;
  silo_role?: "PILLAR" | "SUPPORT" | "AUX" | null;
  silo_group?: string | null;
  silo_group_order?: number | null;
  silo_order?: number | null;
  show_in_silo_menu?: boolean | null;
  is_featured?: boolean | null;
  author_name?: string | null;
  expert_name?: string | null;
  expert_role?: string | null;
  expert_bio?: string | null;
  expert_credentials?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  sources?: any[] | null;
  disclaimer?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  status?: "draft" | "review" | "scheduled" | "published" | null;
  imported_source?: string | null;
  imported_at?: string | null;
  raw_payload?: any | null;
  amazon_products: any | null;
  published: boolean | null;
  updated_at: string;
};


export type PostWithSilo = Post & {
  silo: Pick<Silo, "slug" | "name"> | null;
};

export type PublicHomePost = Pick<
  Post,
  "id" | "title" | "slug" | "target_keyword" | "meta_description" | "hero_image_url" | "hero_image_alt" | "cover_image" | "og_image_url" | "updated_at"
> & {
  silo: Pick<Silo, "slug" | "name"> | null;
};

export type SiloBatch = {
  id: string;
  silo_id: string;
  name: string;
  status: "draft" | "review" | "scheduled" | "published";
  created_at: string;
};

export type SiloBatchPost = {
  batch_id: string;
  post_id: string;
  position: number;
  created_at: string;
};

export type PostLink = {
  id: string;
  source_post_id: string;
  target_post_id: string | null;
  target_url: string | null;
  anchor_text: string | null;
  link_type: "internal" | "external" | "affiliate" | "about" | "mention";
  rel_flags: string[] | null;
  is_blank: boolean;
  created_at: string;
};
