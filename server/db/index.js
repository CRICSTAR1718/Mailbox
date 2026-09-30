import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const DB_PATH = path.join(here, '..', 'data', 'mail.db');
const SCHEMA_PATH = path.join(here, 'schema.sql');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema uses IF NOT EXISTS, so this only creates what's missing.
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

export default db;
