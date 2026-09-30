// Client twin of the server's search parser: turns the filter panel's fields into a query
// string (from:, to:, subject:, has:attachment plus plain words) and back.
const TOKEN = /(\w+):(?:"([^"]*)"|(\S+))|"([^"]*)"|(\S+)/g;

const quote = (v) => (/\s/.test(v) ? `"${v.replace(/"/g, '')}"` : v);

export const EMPTY_FILTERS = { from: '', to: '', subject: '', words: '', hasAttachment: false };

export function buildQuery(f) {
  const parts = [];
  if (f.from.trim()) parts.push(`from:${quote(f.from.trim())}`);
  if (f.to.trim()) parts.push(`to:${quote(f.to.trim())}`);
  if (f.subject.trim()) parts.push(`subject:${quote(f.subject.trim())}`);
  if (f.words.trim()) parts.push(f.words.trim());
  if (f.hasAttachment) parts.push('has:attachment');
  return parts.join(' ');
}

export function parseQuery(q) {
  const out = { ...EMPTY_FILTERS };
  const words = [];
  for (const m of q.matchAll(TOKEN)) {
    const op = m[1]?.toLowerCase();
    const value = (m[2] ?? m[3] ?? '').trim();
    if (op === 'from' || op === 'to' || op === 'subject') out[op] = value;
    else if (op === 'has' && value.toLowerCase() === 'attachment') out.hasAttachment = true;
    else words.push(m[0]);
  }
  out.words = words.join(' ');
  return out;
}
