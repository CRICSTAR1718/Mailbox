import express from 'express';
import api from '../routes/index.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', api);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

app.listen(PORT, () => {
  console.log(`Mailbox server listening on http://localhost:${PORT}`);
});
