import { Router } from 'express';
import db from '../db/index.js';
import { bad } from './util.js';

const router = Router();

// Prefix matches on name or email come first, then substring matches; the current user is excluded.
const search = db.prepare(`
  SELECT id, name, email, avatar_color FROM users
  WHERE id != @uid AND (name LIKE @any ESCAPE '\\' OR email LIKE @any ESCAPE '\\')
  ORDER BY (name LIKE @prefix ESCAPE '\\' OR email LIKE @prefix ESCAPE '\\') DESC, name COLLATE NOCASE
  LIMIT @limit`);

// GET /api/users?q=ra&limit=8 - recipient autocomplete
router.get('/', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length > 100) throw bad('q must be at most 100 characters');
  const limit = req.query.limit === undefined ? 8 : Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw bad('limit must be an integer between 1 and 20');
  const like = q.replace(/[\\%_]/g, '\\$&');
  res.json({ users: search.all({ uid: req.userId, any: `%${like}%`, prefix: `${like}%`, limit }) });
});

export default router;
