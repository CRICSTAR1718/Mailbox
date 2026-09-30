import { Router } from 'express';
import mail from './mail.js';
import threads from './threads.js';
import drafts from './drafts.js';
import labels from './labels.js';
import counts from './counts.js';
import users from './users.js';

const api = Router();

// No auth yet: every request acts as user 1 (Adeela Azeez).
api.use((req, res, next) => {
  req.userId = 1;
  next();
});

api.use('/mail', mail);
api.use('/threads', threads);
api.use('/drafts', drafts);
api.use('/labels', labels);
api.use('/counts', counts);
api.use('/users', users);

export default api;
