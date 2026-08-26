import { Database } from 'bun:sqlite';
import * as fs from 'node:fs';
import { TAU_DIR, STATE_DB_PATH } from '../tau-dir.ts';

if (!fs.existsSync(TAU_DIR)) {
    fs.mkdirSync(TAU_DIR, { recursive: true });
}

export const db = new Database(STATE_DB_PATH);

db.run(`
  CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    source TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(content, content='facts');

  CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    summary TEXT,
    raw_messages TEXT, -- JSON
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    instruction TEXT NOT NULL,
    trigger_keywords TEXT -- JSON array
  );
`);
