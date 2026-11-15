BEGIN;

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  head_of_department TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Announcement',
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT announcements_category_check
    CHECK (category IN ('News', 'Announcement', 'Event')),
  CONSTRAINT announcements_title_length
    CHECK (char_length(title) BETWEEN 3 AND 160),
  CONSTRAINT announcements_summary_length
    CHECK (char_length(summary) BETWEEN 10 AND 300),
  CONSTRAINT announcements_body_length
    CHECK (char_length(body) BETWEEN 10 AND 10000)
);

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS announcements_published_idx
  ON announcements (is_published, published_at DESC);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
