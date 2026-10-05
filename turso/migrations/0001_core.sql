-- Mini WordPress neutral Core: SQLite/libSQL. No brand seeds.

CREATE TABLE silos (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  name TEXT not null,
  slug TEXT not null unique,
  description TEXT,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  meta_title TEXT,
  meta_description TEXT,
  hero_image_url TEXT,
  hero_image_alt TEXT,
  pillar_content_json TEXT  CHECK (pillar_content_json IS NULL OR json_valid(pillar_content_json)),
  pillar_content_html TEXT,
  menu_order INTEGER default 0,
  is_active INTEGER DEFAULT 1 CHECK (is_active IS NULL OR is_active IN (0,1)),
  show_in_navigation INTEGER DEFAULT 1 CHECK (show_in_navigation IS NULL OR show_in_navigation IN (0,1)),
  url_locked_at TEXT,
  deleted_at TEXT,
  deleted_redirect_path TEXT,
  deletion_reason TEXT
);

CREATE TABLE posts (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  silo_id TEXT references silos(id) on delete set null,
  title TEXT not null DEFAULT '',
  slug TEXT not null unique DEFAULT '',
  target_keyword TEXT not null DEFAULT '',
  content_json TEXT  CHECK (content_json IS NULL OR json_valid(content_json)),
  content_html TEXT,
  seo_score INTEGER default 0,
  supporting_keywords TEXT DEFAULT '[]' CHECK (supporting_keywords IS NULL OR json_valid(supporting_keywords)),
  meta_description TEXT,
  seo_title TEXT,
  cover_image TEXT,
  intent TEXT,
  pillar_rank INTEGER default 0,
  is_featured INTEGER DEFAULT 0 CHECK (is_featured IS NULL OR is_featured IN (0,1)),
  amazon_products TEXT default '[]' CHECK (amazon_products IS NULL OR json_valid(amazon_products)),
  published INTEGER DEFAULT 0 CHECK (published IS NULL OR published IN (0,1)),
  updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  meta_title TEXT,
  canonical_path TEXT,
  entities TEXT DEFAULT '[]' CHECK (entities IS NULL OR json_valid(entities)),
  schema_type TEXT default 'article',
  hero_image_url TEXT,
  hero_image_alt TEXT,
  og_image_url TEXT,
  images TEXT default '[]' CHECK (images IS NULL OR json_valid(images)),
  author_name TEXT,
  status TEXT default 'draft',
  published_at TEXT,
  scheduled_at TEXT,
  faq_json TEXT  CHECK (faq_json IS NULL OR json_valid(faq_json)),
  howto_json TEXT  CHECK (howto_json IS NULL OR json_valid(howto_json)),
  expert_name TEXT,
  expert_role TEXT,
  expert_bio TEXT,
  expert_credentials TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  sources TEXT default '[]' CHECK (sources IS NULL OR json_valid(sources)),
  disclaimer TEXT,
  excerpt TEXT,
  imported_source TEXT,
  imported_at TEXT,
  raw_payload TEXT  CHECK (raw_payload IS NULL OR json_valid(raw_payload)),
  focus_keyword TEXT,
  silo_group TEXT,
  silo_group_order INTEGER default 0,
  show_in_silo_menu INTEGER DEFAULT 1 CHECK (show_in_silo_menu IS NULL OR show_in_silo_menu IN (0,1)),
  silo_role TEXT,
  silo_order INTEGER default 0,
  url_locked_at TEXT,
  deleted_at TEXT,
  deleted_redirect_path TEXT,
  deletion_reason TEXT,
  CHECK (silo_role IS NULL OR silo_role IN ('PILLAR','SUPPORT','AUX')),
  CHECK (status IN ('draft','review','scheduled','published')),
  CHECK (schema_type IN ('article','review','faq','howto')),
  CHECK ((status = 'published' AND published = 1) OR (status <> 'published' AND published = 0))
);

CREATE TABLE silo_batches (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  silo_id TEXT references silos(id) on delete cascade,
  name TEXT not null,
  status TEXT not null default 'draft',
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE silo_batch_posts (
  batch_id TEXT references silo_batches(id) on delete cascade,
  post_id TEXT references posts(id) on delete cascade,
  position INTEGER not null default 1,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  primary key (batch_id, post_id)
);

CREATE TABLE post_links (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  source_post_id TEXT references posts(id) on delete cascade,
  target_post_id TEXT references posts(id) on delete set null,
  target_url TEXT,
  anchor_text TEXT,
  link_type TEXT not null,
  rel_flags TEXT DEFAULT '[]' CHECK (rel_flags IS NULL OR json_valid(rel_flags)),
  is_blank INTEGER DEFAULT 0 CHECK (is_blank IS NULL OR is_blank IN (0,1)),
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE wp_app_passwords (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  username TEXT not null,
  display_name TEXT,
  password_hash TEXT not null,
  is_active INTEGER DEFAULT 1 CHECK (is_active IS NULL OR is_active IN (0,1)),
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE wp_id_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT not null,
  entity_uuid TEXT,
  entity_key TEXT,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE wp_media (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  url TEXT not null,
  alt_text TEXT,
  title TEXT,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE google_cse_settings (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  api_key TEXT,
  cx TEXT,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE serp_cache (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  query TEXT not null,
  gl TEXT,
  hl TEXT,
  num INTEGER,
  start INTEGER,
  items TEXT not null CHECK (items IS NULL OR json_valid(items)),
  meta TEXT  CHECK (meta IS NULL OR json_valid(meta)),
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE silo_groups (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  silo_id TEXT not null references silos(id) on delete cascade,
  key TEXT not null,
  label TEXT not null,
  menu_order INTEGER not null default 0,
  keywords TEXT not null DEFAULT '[]' CHECK (keywords IS NULL OR json_valid(keywords)),
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  unique (silo_id, key)
);

CREATE TABLE silo_posts (
  silo_id TEXT not null references silos(id) on delete cascade,
  post_id TEXT not null references posts(id) on delete cascade,
  role TEXT,
  position INTEGER default 0,
  level INTEGER not null default 0,
  parent_post_id TEXT references posts(id) on delete set null,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  primary key (silo_id, post_id),
  CHECK (role IS NULL OR role IN ('PILLAR','SUPPORT','AUX'))
);

CREATE TABLE post_link_occurrences (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  silo_id TEXT not null references silos(id) on delete cascade,
  source_post_id TEXT not null references posts(id) on delete cascade,
  target_post_id TEXT references posts(id) on delete set null,
  anchor_text TEXT not null,
  context_snippet TEXT,
  position_bucket TEXT CHECK (position_bucket IS NULL OR position_bucket IN ('START','MID','END')),
  href_normalized TEXT not null,
  link_type TEXT not null default 'INTERNAL' CHECK (link_type IN ('INTERNAL','EXTERNAL','AFFILIATE')),
  is_nofollow INTEGER not null DEFAULT 0 CHECK (is_nofollow IS NULL OR is_nofollow IN (0,1)),
  is_sponsored INTEGER not null DEFAULT 0 CHECK (is_sponsored IS NULL OR is_sponsored IN (0,1)),
  is_ugc INTEGER not null DEFAULT 0 CHECK (is_ugc IS NULL OR is_ugc IN (0,1)),
  is_blank INTEGER not null DEFAULT 0 CHECK (is_blank IS NULL OR is_blank IN (0,1)),
  start_index INTEGER,
  end_index INTEGER,
  occurrence_key TEXT,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE silo_audits (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  silo_id TEXT not null references silos(id) on delete cascade,
  fingerprint TEXT not null,
  health_score INTEGER not null CHECK (health_score BETWEEN 0 AND 100),
  status TEXT not null CHECK (status IN ('OK','WARNING','CRITICAL')),
  summary TEXT not null DEFAULT '[]' CHECK (summary IS NULL OR json_valid(summary)),
  issues TEXT not null default '[]' CHECK (issues IS NULL OR json_valid(issues)),
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE link_audits (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  silo_id TEXT references silos(id) on delete cascade,
  occurrence_id TEXT not null references post_link_occurrences(id) on delete cascade,
  score INTEGER not null CHECK (score BETWEEN 0 AND 100),
  label TEXT not null CHECK (label IN ('STRONG','OK','WEAK')),
  reasons TEXT not null default '[]' CHECK (reasons IS NULL OR json_valid(reasons)),
  suggested_anchor TEXT,
  note TEXT,
  action TEXT,
  recommendation TEXT,
  spam_risk INTEGER,
  intent_match INTEGER,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE url_redirects (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  source_path TEXT not null unique,
  target_path TEXT not null default '/pagina-nao-encontrada',
  entity_type TEXT not null check (entity_type in ('post', 'silo')),
  entity_id TEXT,
  status_code INTEGER not null default 308 check (status_code in (301, 302, 307, 308)),
  reason TEXT,
  created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE post_views (
  id TEXT primary key default (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  post_id TEXT not null references posts(id) on delete cascade,
  slug TEXT not null,
  silo_slug TEXT not null,
  path TEXT,
  user_agent TEXT,
  ip_address TEXT,
  viewed_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX posts_silo_id_idx ON posts (silo_id);
CREATE INDEX posts_updated_at_idx ON posts (updated_at desc);
CREATE INDEX posts_status_idx ON posts (status);
CREATE INDEX posts_scheduled_at_idx ON posts (scheduled_at);
CREATE INDEX posts_slug_idx ON posts (slug);
CREATE INDEX post_links_source_idx ON post_links (source_post_id);
CREATE INDEX post_links_target_idx ON post_links (target_post_id);
CREATE INDEX silo_batches_silo_idx ON silo_batches (silo_id);
CREATE INDEX wp_app_passwords_username_idx ON wp_app_passwords (username);
CREATE INDEX wp_app_passwords_active_idx ON wp_app_passwords (is_active);
CREATE UNIQUE INDEX wp_id_map_uuid_unique ON wp_id_map (entity_type, entity_uuid)
  where entity_uuid is not null;
CREATE UNIQUE INDEX wp_id_map_key_unique ON wp_id_map (entity_type, entity_key)
  where entity_key is not null;
CREATE INDEX serp_cache_query_idx ON serp_cache (query);
CREATE INDEX serp_cache_created_idx ON serp_cache (created_at desc);
CREATE INDEX idx_posts_silo_group_order ON posts (silo_id, silo_group, silo_group_order, updated_at desc);
CREATE INDEX idx_posts_silo_menu_visibility ON posts (silo_id, show_in_silo_menu);
CREATE INDEX idx_posts_silo_role ON posts (silo_id, silo_role);
CREATE INDEX idx_posts_silo_order ON posts (silo_id, silo_group, silo_order, updated_at desc);
CREATE UNIQUE INDEX idx_posts_unique_pillar_per_silo ON posts (silo_id)
  where silo_id is not null and silo_role = 'PILLAR';
CREATE INDEX idx_silo_groups_silo_order ON silo_groups (silo_id, menu_order, created_at);
CREATE INDEX idx_silo_posts_silo ON silo_posts (silo_id);
CREATE INDEX idx_silo_posts_post ON silo_posts (post_id);
CREATE INDEX idx_silo_posts_role ON silo_posts (role);
CREATE INDEX idx_occurrences_silo ON post_link_occurrences (silo_id);
CREATE INDEX idx_occurrences_source ON post_link_occurrences (silo_id, source_post_id);
CREATE INDEX idx_occurrences_target ON post_link_occurrences (silo_id, target_post_id);
CREATE INDEX idx_occurrences_pair ON post_link_occurrences (source_post_id, target_post_id);
CREATE INDEX idx_occurrences_key ON post_link_occurrences (occurrence_key);
CREATE INDEX idx_silo_audits_silo ON silo_audits (silo_id);
CREATE INDEX idx_silo_audits_fingerprint ON silo_audits (fingerprint);
CREATE INDEX idx_silo_audits_created ON silo_audits (created_at desc);
CREATE INDEX idx_link_audits_silo ON link_audits (silo_id);
CREATE INDEX idx_link_audits_occurrence ON link_audits (occurrence_id);
CREATE INDEX idx_link_audits_action ON link_audits (action);
CREATE INDEX idx_link_audits_spam_risk ON link_audits (spam_risk);
CREATE INDEX idx_silos_public_navigation ON silos (is_active, show_in_navigation, menu_order);
CREATE INDEX posts_public_not_deleted_idx ON posts (published, deleted_at, silo_id, slug);
CREATE INDEX silos_public_not_deleted_idx ON silos (is_active, deleted_at, slug);
CREATE INDEX idx_post_views_viewed_at ON post_views (viewed_at desc);
CREATE INDEX idx_post_views_post_week ON post_views (post_id, viewed_at desc);
