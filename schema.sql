-- schema.sql（D1）
CREATE TABLE users (
  id TEXT PRIMARY KEY,        -- "github:<user_id>" など
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE presets (
  id TEXT PRIMARY KEY,        -- slug（URL用） or uuid
  title TEXT NOT NULL,
  packages TEXT NOT NULL,     -- JSON文字列 ["react","vue",...]
  owner_id TEXT NOT NULL REFERENCES users(id),
  likes_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE likes (
  user_id TEXT NOT NULL REFERENCES users(id),
  preset_id TEXT NOT NULL REFERENCES presets(id),
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, preset_id)
);

CREATE INDEX idx_presets_likes ON presets(likes_count DESC, created_at DESC);