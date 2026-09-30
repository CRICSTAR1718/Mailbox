import { Router } from 'express';
import db from '../db/index.js';
import { FOLDERS, CATEGORIES } from './util.js';

const router = Router();

// Counts are in conversations (threads); a thread is unread if any of its messages is.
const byGroup = (col, extra = '') => db.prepare(`
  SELECT mi.${col} AS k,
         COUNT(DISTINCT e.thread_id) AS total,
         COUNT(DISTINCT CASE WHEN mi.is_read = 0 THEN e.thread_id END) AS unread
  FROM mailbox_items mi JOIN emails e ON e.id = mi.email_id
  WHERE mi.owner_user_id = ? ${extra}
  GROUP BY mi.${col}`);
const folders = byGroup('folder');
const categories = byGroup('category', "AND mi.folder = 'inbox'");
const starred = db.prepare(`
  SELECT COUNT(DISTINCT e.thread_id) AS n
  FROM mailbox_items mi JOIN emails e ON e.id = mi.email_id
  WHERE mi.owner_user_id = ? AND mi.is_starred = 1 AND mi.folder NOT IN ('trash', 'spam')`);

const shape = (keys, rows) => {
  const out = Object.fromEntries(keys.map((k) => [k, { unread: 0, total: 0 }]));
  for (const r of rows) out[r.k] = { unread: r.unread, total: r.total };
  return out;
};

router.get('/', (req, res) => {
  res.json({
    folders: shape(FOLDERS, folders.all(req.userId)),
    categories: shape(CATEGORIES, categories.all(req.userId)),
    starred: starred.get(req.userId).n,
  });
});

export default router;
