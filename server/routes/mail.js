import { Router } from 'express';
import db from '../db/index.js';
import {
  FOLDERS, CATEGORIES, MOVE_FOLDERS, bad, notFound, parseId, parseIdList, parseFlag, requireObject,
  iso, asBool, labelsForItem,
} from './util.js';
import { searchClauses } from './search.js';
import { parseCompose, chooseThread, addRecipients, createEmail, createItem } from './compose.js';

const router = Router();

// ------------------------------------------------------------------ list
const stmtCache = new Map();
const prep = (sql) => {
  if (!stmtCache.has(sql)) stmtCache.set(sql, db.prepare(sql));
  return stmtCache.get(sql);
};

const threadLabels = db.prepare(`
  SELECT DISTINCT l.id, l.name, l.color
  FROM mailbox_item_labels mil
  JOIN labels l ON l.id = mil.label_id
  JOIN mailbox_items mi ON mi.id = mil.mailbox_item_id
  JOIN emails e ON e.id = mi.email_id
  WHERE mi.owner_user_id = ? AND e.thread_id = ? ORDER BY l.name`);
const toRecipients = db.prepare(`
  SELECT u.id, u.name, u.email FROM email_recipients r JOIN users u ON u.id = r.user_id
  WHERE r.email_id = ? AND r.type = 'to' ORDER BY r.id`);
const labelOwned = db.prepare('SELECT id FROM labels WHERE id = ? AND owner_user_id = ?');

function queryString(req, name) {
  const v = req.query[name];
  if (v === undefined) return undefined;
  if (typeof v !== 'string') throw bad(`${name} must be a single value`);
  return v;
}
function intParam(req, name, def, min, max) {
  const v = queryString(req, name);
  if (v === undefined || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${name} must be an integer between ${min} and ${max}`);
  return n;
}

router.get('/', (req, res) => {
  const uid = req.userId;
  const folder = queryString(req, 'folder');
  const category = queryString(req, 'category');
  const labelRaw = queryString(req, 'label');
  const starredRaw = queryString(req, 'starred');
  const q = (queryString(req, 'q') ?? '').trim();
  const page = intParam(req, 'page', 1, 1, 1_000_000);
  const limit = intParam(req, 'limit', 50, 1, 100);

  const where = ['mi.owner_user_id = @uid'];
  const params = { uid };

  if (folder !== undefined && folder !== 'all' && !FOLDERS.includes(folder)) {
    throw bad(`folder must be one of: ${FOLDERS.join(', ')}, all`);
  }
  if (category !== undefined && !CATEGORIES.includes(category)) {
    throw bad(`category must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (starredRaw !== undefined && !['0', '1', 'true', 'false'].includes(starredRaw)) {
    throw bad('starred must be 0, 1, true or false');
  }
  const starred = starredRaw === '1' || starredRaw === 'true';

  // Without an explicit folder: inbox for plain views, everything but spam/trash for searches & filters.
  const broad = q || starred || labelRaw !== undefined;
  if (folder === 'all' || (folder === undefined && broad)) {
    where.push("mi.folder NOT IN ('spam', 'trash')");
  } else {
    where.push('mi.folder = @folder');
    params.folder = folder ?? 'inbox';
  }
  if (category) { where.push('mi.category = @category'); params.category = category; }
  if (starred) where.push('mi.is_starred = 1');
  if (labelRaw !== undefined) {
    const labelId = parseId(labelRaw, 'label');
    if (!labelOwned.get(labelId, uid)) throw notFound('Label not found');
    where.push('EXISTS (SELECT 1 FROM mailbox_item_labels l WHERE l.mailbox_item_id = mi.id AND l.label_id = @label)');
    params.label = labelId;
  }
  if (q) {
    if (q.length > 300) throw bad('q must be at most 300 characters');
    where.push(...searchClauses(q, params));
  }

  const from = `FROM mailbox_items mi
                JOIN emails e ON e.id = mi.email_id
                JOIN users u ON u.id = e.from_user_id
                WHERE ${where.join(' AND ')}`;

  const total = prep(`SELECT COUNT(DISTINCT e.thread_id) AS n ${from}`).get(params).n;

  // One row per thread: the latest matching message, plus whole-thread aggregates.
  const rows = prep(`
    WITH f AS (
      SELECT mi.id AS item_id, mi.email_id, mi.folder, mi.category, mi.is_starred, mi.is_important,
             e.thread_id, e.sent_at, e.subject, e.snippet, e.from_user_id
      ${from}
    ), r AS (
      SELECT f.*, ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY sent_at DESC, email_id DESC) AS rn FROM f
    )
    SELECT r.*, u.name AS from_name, u.email AS from_email, u.avatar_color AS from_color,
      (SELECT COUNT(*) FROM mailbox_items m2 JOIN emails e2 ON e2.id = m2.email_id
        WHERE m2.owner_user_id = @uid AND e2.thread_id = r.thread_id) AS message_count,
      (SELECT COUNT(*) FROM mailbox_items m2 JOIN emails e2 ON e2.id = m2.email_id
        WHERE m2.owner_user_id = @uid AND e2.thread_id = r.thread_id AND m2.is_read = 0) AS unread_count,
      EXISTS (SELECT 1 FROM attachments a JOIN emails e2 ON e2.id = a.email_id
        JOIN mailbox_items m2 ON m2.email_id = e2.id AND m2.owner_user_id = @uid
        WHERE e2.thread_id = r.thread_id) AS has_attachment
    FROM r JOIN users u ON u.id = r.from_user_id
    WHERE r.rn = 1
    ORDER BY r.sent_at DESC, r.email_id DESC
    LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset: (page - 1) * limit });

  const threads = rows.map((r) => ({
    thread_id: r.thread_id,
    item_id: r.item_id,
    email_id: r.email_id,
    folder: r.folder,
    category: r.category,
    from: { id: r.from_user_id, name: r.from_name, email: r.from_email, avatar_color: r.from_color },
    from_name: r.from_name,
    to: toRecipients.all(r.email_id),
    subject: r.subject,
    snippet: r.snippet,
    sent_at: iso(r.sent_at),
    is_read: r.unread_count === 0,
    is_starred: !!r.is_starred,
    is_important: !!r.is_important,
    labels: threadLabels.all(uid, r.thread_id),
    has_attachment: !!r.has_attachment,
    message_count: r.message_count,
  }));

  res.json({ threads, total, page, limit });
});

// ----------------------------------------------------------------- update
const itemById = db.prepare(`
  SELECT id, email_id, folder, category, is_read, is_starred, is_important
  FROM mailbox_items WHERE id = ? AND owner_user_id = ?`);
const patchItem = db.prepare(`
  UPDATE mailbox_items SET
    is_read = COALESCE(@is_read, is_read),
    is_starred = COALESCE(@is_starred, is_starred),
    is_important = COALESCE(@is_important, is_important),
    folder = COALESCE(@folder, folder)
  WHERE id = @id AND owner_user_id = @uid`);
const FLAGS = ['is_read', 'is_starred', 'is_important'];
const NO_CHANGE = { is_read: null, is_starred: null, is_important: null, folder: null };

function parseFolderTarget(value) {
  if (!MOVE_FOLDERS.includes(value)) throw bad(`folder must be one of: ${MOVE_FOLDERS.join(', ')}`);
  return value;
}

router.patch('/:itemId', (req, res) => {
  const id = parseId(req.params.itemId, 'itemId');
  const body = requireObject(req.body);
  const changes = { ...NO_CHANGE };
  let any = false;
  for (const key of FLAGS) {
    if (key in body) { changes[key] = parseFlag(body[key], key); any = true; }
  }
  if ('folder' in body) { changes.folder = parseFolderTarget(body.folder); any = true; }
  if (!any) throw bad(`Provide at least one of: ${[...FLAGS, 'folder'].join(', ')}`);

  if (!itemById.get(id, req.userId)) throw notFound('Mail item not found');
  patchItem.run({ ...changes, id, uid: req.userId });
  res.json(asBool(itemById.get(id, req.userId), FLAGS));
});

// ------------------------------------------------------------------- bulk
const BULK_ACTIONS = {
  read: { is_read: 1 },
  unread: { is_read: 0 },
  star: { is_starred: 1 },
  unstar: { is_starred: 0 },
  archive: { folder: 'archive' },
  trash: { folder: 'trash' },
  spam: { folder: 'spam' },
};
// When these expand a thread, my Sent/Drafts copies stay where they are (like Gmail),
// unless the thread has nothing else.
const KEEP_SENT = new Set(['archive', 'spam', 'move']);
const FOLDER_CHANGING = new Set(['archive', 'trash', 'spam', 'move']);
const placeholders = (n) => Array(n).fill('?').join(',');
const deleteItem = db.prepare('DELETE FROM mailbox_items WHERE id = ?');
const deleteOrphanEmail = db.prepare(
  'DELETE FROM emails WHERE id = ? AND NOT EXISTS (SELECT 1 FROM mailbox_items WHERE email_id = emails.id)');
const setFolder = db.prepare('UPDATE mailbox_items SET folder = ? WHERE id = ? AND owner_user_id = ?');

function ownedItems(uid, ids) {
  if (!ids.length) return [];
  return db.prepare(`SELECT id, email_id, folder FROM mailbox_items
    WHERE owner_user_id = ? AND id IN (${placeholders(ids.length)})`).all(uid, ...ids);
}

router.post('/bulk', (req, res) => {
  const body = requireObject(req.body);
  const uid = req.userId;
  const actions = [...Object.keys(BULK_ACTIONS), 'delete', 'move', 'label', 'unlabel', 'restore'];
  if (!actions.includes(body.action)) throw bad(`action must be one of: ${actions.join(', ')}`);

  // restore: put items back in the folders they were in (the undo for archive/trash/spam/move)
  if (body.action === 'restore') {
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 2000) {
      throw bad('items must be a non-empty array of { id, folder }');
    }
    const wanted = body.items.map((it) => {
      const item = requireObject(it);
      if (!FOLDERS.includes(item.folder)) throw bad(`folder must be one of: ${FOLDERS.join(', ')}`);
      return { id: parseId(item.id, 'items[].id'), folder: item.folder };
    });
    const owned = new Set(ownedItems(uid, wanted.map((w) => w.id)).map((o) => o.id));
    if (owned.size === 0) throw notFound('No matching mail items found');
    db.transaction(() => {
      for (const w of wanted) if (owned.has(w.id)) setFolder.run(w.folder, w.id, uid);
    })();
    return res.json({ action: 'restore', updated: owned.size });
  }

  const changes = body.action === 'move' ? { folder: parseFolderTarget(body.folder) } : BULK_ACTIONS[body.action];
  const labelAction = body.action === 'label' || body.action === 'unlabel';
  let labelId = null;
  if (labelAction) {
    labelId = parseId(body.labelId, 'labelId');
    if (!labelById.get(labelId, uid)) throw notFound('Label not found');
  }

  // itemIds per the API; threadIds is a convenience that expands to the user's items in those threads
  if (body.itemIds === undefined && body.threadIds === undefined) throw bad('itemIds must be a non-empty array');
  let ids = body.itemIds === undefined ? [] : parseIdList(body.itemIds, 'itemIds');
  if (body.threadIds !== undefined) {
    const threadIds = parseIdList(body.threadIds, 'threadIds');
    const rows = db.prepare(`
      SELECT mi.id, mi.folder, e.thread_id FROM mailbox_items mi JOIN emails e ON e.id = mi.email_id
      WHERE mi.owner_user_id = ? AND e.thread_id IN (${placeholders(threadIds.length)})`)
      .all(uid, ...threadIds);
    const byThread = new Map();
    for (const r of rows) byThread.set(r.thread_id, [...(byThread.get(r.thread_id) ?? []), r]);
    const expanded = [];
    for (const group of byThread.values()) {
      const others = group.filter((r) => r.folder !== 'sent' && r.folder !== 'drafts');
      expanded.push(...(KEEP_SENT.has(body.action) && others.length ? others : group));
    }
    ids = [...new Set([...ids, ...expanded.map((r) => r.id)])];
  }

  const owned = ownedItems(uid, ids);
  if (owned.length === 0) throw notFound('No matching mail items found');

  db.transaction(() => {
    for (const { id, email_id } of owned) {
      if (body.action === 'delete') {
        deleteItem.run(id);
        deleteOrphanEmail.run(email_id);
      } else if (labelAction) {
        (body.action === 'label' ? attachLabel : detachLabel).run(id, labelId);
      } else {
        patchItem.run({ ...NO_CHANGE, ...changes, id, uid });
      }
    }
  })();

  const found = new Set(owned.map((o) => o.id));
  res.json({
    action: body.action,
    updated: owned.length,
    notFound: ids.filter((i) => !found.has(i)),
    // where each item was before, so a move can be undone with action "restore"
    ...(FOLDER_CHANGING.has(body.action) ? { previous: owned.map((o) => ({ id: o.id, folder: o.folder })) } : {}),
  });
});

// ------------------------------------------------------------------- send
const draftItem = db.prepare(
  "SELECT email_id FROM mailbox_items WHERE id = ? AND owner_user_id = ? AND folder = 'drafts'");
const deleteEmail = db.prepare('DELETE FROM emails WHERE id = ?');

router.post('/send', (req, res) => {
  const uid = req.userId;
  const c = parseCompose(req.body, { strict: true });
  const draftId = req.body.draftId == null ? null : parseId(req.body.draftId, 'draftId');

  const result = db.transaction(() => {
    const draft = draftId ? draftItem.get(draftId, uid) : null;
    if (draftId && !draft) throw notFound('Draft not found');
    const threadId = chooseThread(uid, c.threadId);
    const emailId = createEmail({ fromId: uid, threadId, subject: c.subject || '(no subject)', text: c.text, isDraft: false });

    const recipientIds = [
      ...addRecipients(emailId, 'to', c.to),
      ...addRecipients(emailId, 'cc', c.cc),
      ...addRecipients(emailId, 'bcc', c.bcc),
    ];
    const sentItemId = createItem(emailId, uid, 'sent', true);
    // each recipient gets their own inbox copy (a message to yourself only has the sent copy)
    for (const rid of new Set(recipientIds)) if (rid !== uid) createItem(emailId, rid, 'inbox', false);
    if (draft) deleteEmail.run(draft.email_id);
    return { email_id: emailId, thread_id: threadId, sent_item_id: sentItemId, recipients: recipientIds.length };
  })();

  res.status(201).json(result);
});

// ----------------------------------------------------------- item labels
const labelById = db.prepare('SELECT id FROM labels WHERE id = ? AND owner_user_id = ?');
const attachLabel = db.prepare('INSERT OR IGNORE INTO mailbox_item_labels (mailbox_item_id, label_id) VALUES (?, ?)');
const detachLabel = db.prepare('DELETE FROM mailbox_item_labels WHERE mailbox_item_id = ? AND label_id = ?');

router.post('/:itemId/labels', (req, res) => {
  const itemId = parseId(req.params.itemId, 'itemId');
  const labelId = parseId(requireObject(req.body).labelId, 'labelId');
  if (!itemById.get(itemId, req.userId)) throw notFound('Mail item not found');
  if (!labelById.get(labelId, req.userId)) throw notFound('Label not found');
  attachLabel.run(itemId, labelId);
  res.status(201).json({ item_id: itemId, labels: labelsForItem(itemId) });
});

router.delete('/:itemId/labels/:labelId', (req, res) => {
  const itemId = parseId(req.params.itemId, 'itemId');
  const labelId = parseId(req.params.labelId, 'labelId');
  if (!itemById.get(itemId, req.userId)) throw notFound('Mail item not found');
  if (!labelById.get(labelId, req.userId)) throw notFound('Label not found');
  if (detachLabel.run(itemId, labelId).changes === 0) throw notFound('Label is not applied to this item');
  res.json({ item_id: itemId, labels: labelsForItem(itemId) });
});

export default router;
