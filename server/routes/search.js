import { bad } from './util.js';

// Gmail-style search: plain words plus from:, to:, subject: and has:attachment.
// Values may be quoted ("two words"); a quoted phrase without an operator is one text term.
const TOKEN = /(\w+):(?:"([^"]*)"|(\S+))|"([^"]*)"|(\S+)/g;

export function parseSearch(q) {
  const out = { text: [], from: [], to: [], subject: [], attachment: false };
  for (const m of q.matchAll(TOKEN)) {
    if (m[1]) {
      const op = m[1].toLowerCase();
      const value = (m[2] ?? m[3] ?? '').trim();
      if (op === 'from' || op === 'to' || op === 'subject') {
        if (value) out[op].push(value);
      } else if (op === 'has') {
        if (value.toLowerCase() !== 'attachment') throw bad(`Unsupported search "has:${value}" (only has:attachment)`);
        out.attachment = true;
      } else {
        out.text.push(m[0]); // not an operator we know, e.g. "re:plan": search for it as text
      }
    } else {
      const value = (m[4] ?? m[5]).trim();
      if (value) out.text.push(value);
    }
  }
  return out;
}

const likeValue = (v) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;

// WHERE clauses (ANDed) for a query, over the aliases mi (mailbox_items), e (emails) and u (sender).
// Bound values are added to `params` as @s0, @s1, ...
export function searchClauses(q, params) {
  const s = parseSearch(q);
  const clauses = [];
  let n = 0;
  const bind = (value) => {
    const name = `s${n++}`;
    params[name] = likeValue(value);
    return `@${name}`;
  };
  const like = (col, p) => `${col} LIKE ${p} ESCAPE '\\'`;

  for (const word of s.text) {
    const p = bind(word);
    clauses.push(`(${like('e.subject', p)} OR ${like('e.body_text', p)} OR ${like('u.name', p)} OR ${like('u.email', p)})`);
  }
  for (const v of s.from) {
    const p = bind(v);
    clauses.push(`(${like('u.name', p)} OR ${like('u.email', p)})`);
  }
  for (const v of s.to) {
    const p = bind(v);
    // to: covers to and cc recipients; bcc only counts on mail I sent
    clauses.push(`EXISTS (SELECT 1 FROM email_recipients r JOIN users ru ON ru.id = r.user_id
      WHERE r.email_id = e.id AND (r.type != 'bcc' OR e.from_user_id = @uid)
        AND (${like('ru.name', p)} OR ${like('ru.email', p)}))`);
  }
  for (const v of s.subject) clauses.push(like('e.subject', bind(v)));
  if (s.attachment) clauses.push('EXISTS (SELECT 1 FROM attachments a WHERE a.email_id = e.id)');
  return clauses;
}
