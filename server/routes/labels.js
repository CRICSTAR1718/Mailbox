import { Router } from 'express';
import db from '../db/index.js';
import { bad, notFound, conflict, parseId, requireObject } from './util.js';

const router = Router();

const list = db.prepare(`
  SELECT l.id, l.name, l.color,
    COUNT(DISTINCT CASE WHEN mi.is_read = 0 THEN e.thread_id END) AS unread_count,
    COUNT(DISTINCT e.thread_id) AS total_count
  FROM labels l
  LEFT JOIN mailbox_item_labels mil ON mil.label_id = l.id
  LEFT JOIN mailbox_items mi ON mi.id = mil.mailbox_item_id AND mi.folder NOT IN ('trash', 'spam')
  LEFT JOIN emails e ON e.id = mi.email_id
  WHERE l.owner_user_id = ?
  GROUP BY l.id ORDER BY l.name COLLATE NOCASE`);
const byName = db.prepare('SELECT id FROM labels WHERE owner_user_id = ? AND name = ? COLLATE NOCASE');
const insert = db.prepare('INSERT INTO labels (owner_user_id, name, color) VALUES (?, ?, ?)');
const owned = db.prepare('SELECT id FROM labels WHERE id = ? AND owner_user_id = ?');
const remove = db.prepare('DELETE FROM labels WHERE id = ? AND owner_user_id = ?');

router.get('/', (req, res) => {
  res.json({ labels: list.all(req.userId) });
});

router.post('/', (req, res) => {
  const body = requireObject(req.body);
  if (typeof body.name !== 'string' || !body.name.trim()) throw bad('name is required');
  const name = body.name.trim();
  if (name.length > 50) throw bad('name must be at most 50 characters');
  const color = body.color ?? '#6b7280';
  if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) throw bad('color must be a hex value like #3b82f6');
  if (byName.get(req.userId, name)) throw conflict('A label with that name already exists');

  const id = Number(insert.run(req.userId, name, color).lastInsertRowid);
  res.status(201).json({ id, name, color, unread_count: 0, total_count: 0 });
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id, 'id');
  if (!owned.get(id, req.userId)) throw notFound('Label not found');
  remove.run(id, req.userId); // mailbox_item_labels rows cascade
  res.json({ deleted: id });
});

export default router;
