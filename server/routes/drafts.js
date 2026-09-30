import { Router } from 'express';
import db from '../db/index.js';
import { notFound, parseId, iso, nowSql, snippetOf, textToHtml } from './util.js';
import { parseCompose, chooseThread, addRecipients, replaceRecipients, createEmail, createItem } from './compose.js';

// Draft ids are mailbox item ids (the same id the list endpoint returns as item_id).
const router = Router();

const draftRow = db.prepare(`
  SELECT mi.id, mi.email_id, e.thread_id, e.subject, e.body_text, e.sent_at
  FROM mailbox_items mi JOIN emails e ON e.id = mi.email_id
  WHERE mi.id = ? AND mi.owner_user_id = ? AND mi.folder = 'drafts'`);
const recipients = db.prepare(`
  SELECT r.type, u.id, u.name, u.email FROM email_recipients r JOIN users u ON u.id = r.user_id
  WHERE r.email_id = ? ORDER BY r.id`);
const updateEmail = db.prepare(`
  UPDATE emails SET subject = ?, body_text = ?, body_html = ?, snippet = ?, sent_at = ? WHERE id = ?`);
const deleteEmail = db.prepare('DELETE FROM emails WHERE id = ?');

function draftOut(id, uid) {
  const d = draftRow.get(id, uid);
  const rcpt = recipients.all(d.email_id);
  const pick = (t) => rcpt.filter((r) => r.type === t).map(({ type, ...u }) => u);
  return {
    id: d.id, email_id: d.email_id, thread_id: d.thread_id, subject: d.subject, body: d.body_text,
    to: pick('to'), cc: pick('cc'), bcc: pick('bcc'), updated_at: iso(d.sent_at),
  };
}

router.post('/', (req, res) => {
  const uid = req.userId;
  const c = parseCompose(req.body ?? {}, { strict: false });
  const id = db.transaction(() => {
    const emailId = createEmail({ fromId: uid, threadId: chooseThread(uid, c.threadId), subject: c.subject, text: c.text, isDraft: true });
    addRecipients(emailId, 'to', c.to);
    addRecipients(emailId, 'cc', c.cc);
    addRecipients(emailId, 'bcc', c.bcc);
    return createItem(emailId, uid, 'drafts', true);
  })();
  res.status(201).json(draftOut(id, uid));
});

// Fields left out of the body are kept as they are.
router.put('/:id', (req, res) => {
  const uid = req.userId;
  const id = parseId(req.params.id, 'id');
  const c = parseCompose(req.body, { strict: false });
  const existing = draftRow.get(id, uid);
  if (!existing) throw notFound('Draft not found');

  db.transaction(() => {
    const subject = c.provided.subject ? c.subject : existing.subject;
    const text = c.provided.body ? c.text : existing.body_text;
    updateEmail.run(subject, text, textToHtml(text), snippetOf(text), nowSql(), existing.email_id);
    for (const type of ['to', 'cc', 'bcc']) {
      if (c.provided[type]) replaceRecipients(existing.email_id, type, c[type]);
    }
  })();
  res.json(draftOut(id, uid));
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id, 'id');
  const existing = draftRow.get(id, req.userId);
  if (!existing) throw notFound('Draft not found');
  deleteEmail.run(existing.email_id); // cascades to the mailbox item and recipients
  res.json({ deleted: id });
});

export default router;
