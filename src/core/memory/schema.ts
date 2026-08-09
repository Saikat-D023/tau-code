import { Database } from 'bun:sqlite';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const tauDir = path.join(os.homedir(), '.tau');
if (!fs.existsSync(tauDir)) {
    fs.mkdirSync(tauDir, { recursive: true });
}

export const db = new Database(path.join(tauDir, 'state.db'));

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
