import fs from 'node:fs';
import { DB_PATH } from './index.js';
import db from './index.js';

db.close();
for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(DB_PATH + suffix, { force: true });
}

// Re-import a fresh connection to recreate the schema.
const { default: fresh } = await import('./index.js?fresh');
const tables = fresh
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((t) => t.name);
fresh.close();
console.log(`Database reset at ${DB_PATH}\nTables: ${tables.join(', ')}`);
