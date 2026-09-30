import db from '../db/index.js';

export const FOLDERS = ['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive'];
export const CATEGORIES = ['primary', 'promotions', 'social', 'updates'];
// Folders an item can be moved into by the user (sent/drafts are created by composing).
export const MOVE_FOLDERS = ['inbox', 'spam', 'trash', 'archive'];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const bad = (msg) => new HttpError(400, msg);
export const notFound = (msg) => new HttpError(404, msg);
export const conflict = (msg) => new HttpError(409, msg);

export function parseId(value, name = 'id') {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(n) || n < 1) throw bad(`${name} must be a positive integer`);
  return n;
}

export function parseIdList(value, name, max = 500) {
  if (!Array.isArray(value) || value.length === 0) throw bad(`${name} must be a non-empty array`);
  if (value.length > max) throw bad(`${name} may contain at most ${max} ids`);
  return [...new Set(value.map((v) => parseId(v, `${name}[]`)))];
}

export function parseFlag(value, name) {
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;
  throw bad(`${name} must be a boolean`);
}

export function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('Request body must be a JSON object');
  return body;
}

// SQLite stores 'YYYY-MM-DD HH:MM:SS' (UTC); the API speaks ISO 8601.
export const iso = (s) => (s ? s.replace(' ', 'T') + 'Z' : s);
export const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
export const snippetOf = (text) => text.replace(/\s+/g, ' ').trim().slice(0, 120);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Plain text -> HTML paragraphs; runs of "> " lines become a <blockquote> (quoted replies).
export const textToHtml = (text) =>
  text
    .split(/\n{2,}/)
    .map((block) => {
      const groups = [];
      for (const line of block.split('\n')) {
        const quoted = line.startsWith('>');
        const last = groups[groups.length - 1];
        if (last && last.quoted === quoted) last.lines.push(line);
        else groups.push({ quoted, lines: [line] });
      }
      return groups
        .map((g) =>
          g.quoted
            ? `<blockquote>${g.lines.map((l) => esc(l.replace(/^>\s?/, ''))).join('<br>')}</blockquote>`
            : `<p>${g.lines.map(esc).join('<br>')}</p>`
        )
        .join('');
    })
    .join('\n');

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export function parseEmails(value, name) {
  if (value == null || value === '') return [];
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,;]/) : null;
  if (!list) throw bad(`${name} must be an array of emails or a comma-separated string`);
  const out = [];
  for (const raw of list) {
    if (typeof raw !== 'string') throw bad(`${name} must contain only strings`);
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    if (email.length > 254 || !EMAIL_RE.test(email)) throw bad(`${name}: invalid email address "${raw}"`);
    if (!out.includes(email)) out.push(email);
  }
  return out;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];
const findUser = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?');
const insertUser = db.prepare('INSERT INTO users (name, email, avatar_color) VALUES (?, ?, ?)');

// Find a user by email, creating a stub user for unknown addresses.
export function resolveUser(email) {
  const existing = findUser.get(email);
  if (existing) return existing;
  const name =
    email.split('@')[0].split(/[._-]+/).filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || email;
  const color = COLORS[[...email].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const id = Number(insertUser.run(name, email, color).lastInsertRowid);
  return { id, name, email, avatar_color: color };
}

export const asBool = (row, keys) => {
  const out = { ...row };
  for (const k of keys) if (k in out) out[k] = !!out[k];
  return out;
};

const itemLabels = db.prepare(`
  SELECT l.id, l.name, l.color FROM mailbox_item_labels mil
  JOIN labels l ON l.id = mil.label_id WHERE mil.mailbox_item_id = ? ORDER BY l.name`);
export const labelsForItem = (itemId) => itemLabels.all(itemId);
