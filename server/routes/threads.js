import { Router } from 'express';
import db from '../db/index.js';
import { notFound, parseId, iso, labelsForItem } from './util.js';

const router = Router();

const messages = db.prepare(`
  SELECT mi.id AS item_id, mi.folder, mi.category, mi.is_read, mi.is_starred, mi.is_important,
         e.id AS email_id, e.thread_id, e.subject, e.body_html, e.body_text, e.sent_at, e.is_draft,
         u.id AS from_id, u.name AS from_name, u.email AS from_email, u.avatar_color AS from_color
  FROM mailbox_items mi
  JOIN emails e ON e.id = mi.email_id
  JOIN users u ON u.id = e.from_user_id
  WHERE mi.owner_user_id = ? AND e.thread_id = ?
  ORDER BY e.sent_at, e.id`);
const recipients = db.prepare(`
  SELECT r.type, u.id, u.name, u.email, u.avatar_color
  FROM email_recipients r JOIN users u ON u.id = r.user_id
  WHERE r.email_id = ? ORDER BY r.id`);
const attachments = db.prepare(
  'SELECT id, filename, mime_type, size_bytes FROM attachments WHERE email_id = ? ORDER BY id');
const markRead = db.prepare(`
  UPDATE mailbox_items SET is_read = 1
  WHERE owner_user_id = ? AND is_read = 0
    AND email_id IN (SELECT id FROM emails WHERE thread_id = ?)`);

router.get('/:threadId', (req, res) => {
  const threadId = parseId(req.params.threadId, 'threadId');
  const uid = req.userId;
  const rows = messages.all(uid, threadId);
  if (rows.length === 0) throw notFound('Thread not found');

  const marked = markRead.run(uid, threadId).changes;

  const list = rows.map((r) => {
    const rcpt = recipients.all(r.email_id);
    const pick = (type) => rcpt.filter((x) => x.type === type).map(({ type, ...u }) => u);
    return {
      item_id: r.item_id,
      email_id: r.email_id,
      thread_id: r.thread_id,
      folder: r.folder,
      category: r.category,
      from: { id: r.from_id, name: r.from_name, email: r.from_email, avatar_color: r.from_color },
      to: pick('to'),
      cc: pick('cc'),
      bcc: r.from_id === uid ? pick('bcc') : [], // bcc is only visible to the sender
      subject: r.subject,
      body_html: r.body_html,
      body_text: r.body_text,
      sent_at: iso(r.sent_at),
      is_draft: !!r.is_draft,
      is_read: true,
      was_unread: !r.is_read,
      is_starred: !!r.is_starred,
      is_important: !!r.is_important,
      labels: labelsForItem(r.item_id),
      attachments: attachments.all(r.email_id),
    };
  });

  res.json({ thread_id: threadId, subject: rows[0].subject, message_count: list.length, marked_read: marked, messages: list });
});

export default router;
