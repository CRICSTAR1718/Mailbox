CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  avatar_color TEXT NOT NULL DEFAULT '#6b7280',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS emails (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id    INTEGER NOT NULL,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL DEFAULT '',
  body_html    TEXT NOT NULL DEFAULT '',
  body_text    TEXT NOT NULL DEFAULT '',
  snippet      TEXT NOT NULL DEFAULT '',
  sent_at      TEXT NOT NULL DEFAULT (datetime('now')),
  is_draft     INTEGER NOT NULL DEFAULT 0 CHECK (is_draft IN (0, 1))
);

CREATE TABLE IF NOT EXISTS email_recipients (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type     TEXT NOT NULL CHECK (type IN ('to', 'cc', 'bcc'))
);

-- Per-user copy/state of an email.
CREATE TABLE IF NOT EXISTS mailbox_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id       INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  owner_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder         TEXT NOT NULL DEFAULT 'inbox'
                 CHECK (folder IN ('inbox', 'sent', 'drafts', 'spam', 'trash', 'archive')),
  is_read        INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  is_starred     INTEGER NOT NULL DEFAULT 0 CHECK (is_starred IN (0, 1)),
  is_important   INTEGER NOT NULL DEFAULT 0 CHECK (is_important IN (0, 1)),
  category       TEXT NOT NULL DEFAULT 'primary'
                 CHECK (category IN ('primary', 'promotions', 'social', 'updates')),
  snoozed_until  TEXT NULL,
  UNIQUE (email_id, owner_user_id)
);

CREATE TABLE IF NOT EXISTS labels (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#6b7280'
);

CREATE TABLE IF NOT EXISTS mailbox_item_labels (
  mailbox_item_id INTEGER NOT NULL REFERENCES mailbox_items(id) ON DELETE CASCADE,
  label_id        INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (mailbox_item_id, label_id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id   INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,
  mime_type  TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mailbox_items_owner_folder ON mailbox_items(owner_user_id, folder);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at);
