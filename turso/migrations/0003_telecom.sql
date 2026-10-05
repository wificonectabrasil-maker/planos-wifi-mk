CREATE TABLE IF NOT EXISTS telecom_offers (
 id TEXT PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE,
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS telecom_leads (
 id TEXT PRIMARY KEY,
 protocol TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 phone TEXT NOT NULL,
 cep TEXT NOT NULL,
 address TEXT NOT NULL DEFAULT '',
 service TEXT NOT NULL CHECK(service IN ('residential','business','condominium','tv','mobile','bundle')),
 interest TEXT NOT NULL DEFAULT '',
 source_path TEXT NOT NULL,
 consent_at TEXT NOT NULL,
 privacy_version TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','closed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS telecom_leads_created_idx ON telecom_leads(created_at DESC);
CREATE TABLE IF NOT EXISTS telecom_rate_limits (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 reset_at INTEGER NOT NULL
);
