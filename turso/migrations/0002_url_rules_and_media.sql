CREATE TRIGGER posts_url_immutable BEFORE UPDATE ON posts
WHEN (OLD.deleted_at IS NOT NULL OR OLD.url_locked_at IS NOT NULL OR OLD.published = 1 OR OLD.status = 'published' OR OLD.published_at IS NOT NULL)
AND (NEW.slug IS NOT OLD.slug OR NEW.canonical_path IS NOT OLD.canonical_path OR NEW.silo_id IS NOT OLD.silo_id)
BEGIN SELECT RAISE(ABORT, 'POST_URL_LOCKED'); END;

CREATE TRIGGER silos_url_immutable BEFORE UPDATE ON silos
WHEN (OLD.deleted_at IS NOT NULL OR OLD.url_locked_at IS NOT NULL) AND NEW.slug IS NOT OLD.slug
BEGIN SELECT RAISE(ABORT, 'SILO_URL_LOCKED'); END;

CREATE TRIGGER posts_lock_after_insert AFTER INSERT ON posts
WHEN NEW.published = 1 OR NEW.status = 'published' OR NEW.published_at IS NOT NULL
BEGIN
  UPDATE posts SET url_locked_at = COALESCE(url_locked_at, published_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = NEW.id;
  UPDATE silos SET url_locked_at = COALESCE(url_locked_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = NEW.silo_id;
END;

CREATE TRIGGER posts_lock_after_update AFTER UPDATE ON posts
WHEN NEW.url_locked_at IS NULL AND (NEW.published = 1 OR NEW.status = 'published' OR NEW.published_at IS NOT NULL)
BEGIN
  UPDATE posts SET url_locked_at = COALESCE(published_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = NEW.id;
  UPDATE silos SET url_locked_at = COALESCE(url_locked_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = NEW.silo_id;
END;

CREATE TABLE media_objects (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length > 0),
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE media_chunks (
  media_id TEXT NOT NULL REFERENCES media_objects(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  data BLOB NOT NULL,
  PRIMARY KEY (media_id, position)
);
