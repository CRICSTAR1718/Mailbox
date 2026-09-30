import db from '../db/index.js';
import {
  bad, notFound, parseEmails, parseId, requireObject, resolveUser, snippetOf, textToHtml, nowSql,
} from './util.js';

const nextThreadId = db.prepare('SELECT COALESCE(MAX(thread_id), 0) + 1 AS id FROM emails');
const threadExists = db.prepare(`
  SELECT 1 FROM mailbox_items mi JOIN emails e ON e.id = mi.email_id
  WHERE mi.owner_user_id = ? AND e.thread_id = ? LIMIT 1`);
const insertEmail = db.prepare(`
  INSERT INTO emails (thread_id, from_user_id, subject, body_html, body_text, snippet, sent_at, is_draft)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const insertRecipient = db.prepare('INSERT INTO email_recipients (email_id, user_id, type) VALUES (?, ?, ?)');
const deleteRecipients = db.prepare('DELETE FROM email_recipients WHERE email_id = ? AND type = ?');
const insertItem = db.prepare(`
  INSERT INTO mailbox_items (email_id, owner_user_id, folder, is_read, category) VALUES (?, ?, ?, ?, 'primary')`);

// Validate a compose payload. `strict` (sending) requires at least one recipient.
export function parseCompose(input, { strict }) {
  const body = requireObject(input);
  const to = parseEmails(body.to, 'to');
  // an address appears once, with precedence to > cc > bcc
  const cc = parseEmails(body.cc, 'cc').filter((e) => !to.includes(e));
  const bcc = parseEmails(body.bcc, 'bcc').filter((e) => !to.includes(e) && !cc.includes(e));

  const subject = body.subject ?? '';
  const text = body.body ?? '';
  if (typeof subject !== 'string' || subject.length > 998) throw bad('subject must be a string of at most 998 characters');
  if (typeof text !== 'string' || text.length > 1_000_000) throw bad('body must be a string');
  if (strict && to.length + cc.length + bcc.length === 0) throw bad('At least one recipient is required');

  const threadId = body.threadId == null ? null : parseId(body.threadId, 'threadId');
  return {
    to, cc, bcc, subject: subject.trim(), text, threadId,
    provided: { to: 'to' in body, cc: 'cc' in body, bcc: 'bcc' in body, subject: 'subject' in body, body: 'body' in body },
  };
}

export function chooseThread(userId, threadId) {
  if (threadId == null) return nextThreadId.get().id;
  if (!threadExists.get(userId, threadId)) throw notFound('Thread not found');
  return threadId;
}

export function addRecipients(emailId, type, addresses) {
  const ids = [];
  for (const address of addresses) {
    const user = resolveUser(address);
    insertRecipient.run(emailId, user.id, type);
    ids.push(user.id);
  }
  return ids;
}
export const replaceRecipients = (emailId, type, addresses) => {
  deleteRecipients.run(emailId, type);
  return addRecipients(emailId, type, addresses);
};

export function createEmail({ fromId, threadId, subject, text, isDraft }) {
  return Number(
    insertEmail.run(threadId, fromId, subject, textToHtml(text), text, snippetOf(text), nowSql(), isDraft ? 1 : 0)
      .lastInsertRowid
  );
}
export function createItem(emailId, ownerId, folder, isRead) {
  return Number(insertItem.run(emailId, ownerId, folder, isRead ? 1 : 0).lastInsertRowid);
}
