const { createClient } = require('@libsql/client');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'mib.db');

const db = createClient({ url: `file:${DB_PATH}` });

async function init() {
  // PRAGMAs must run outside a transaction
  await db.execute('PRAGMA journal_mode = WAL');
  await db.execute('PRAGMA foreign_keys = ON');

  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        username    TEXT    NOT NULL UNIQUE,
        email       TEXT    NOT NULL UNIQUE,
        password    TEXT    NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
      )`,
      args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS entries (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL,
        entry_date    TEXT    NOT NULL,
        stock_name    TEXT    NOT NULL,
        stock_symbol  TEXT    NOT NULL,
        sector        TEXT    NOT NULL,
        type          TEXT    NOT NULL,
        source        TEXT    NOT NULL,
        news          TEXT    NOT NULL,
        opinion       TEXT,
        rating        TEXT,
        investor_name TEXT,
        submitted_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
        edited_at     TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      args: []
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_entries_stock   ON entries(stock_symbol)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_entries_sector  ON entries(sector)',       args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_entries_type    ON entries(type)',         args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_entries_date    ON entries(entry_date)',   args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_entries_user    ON entries(user_id)',      args: [] },
  ], 'write');

  // Migration: add edited_at column if it doesn't exist yet
  try {
    await db.execute('ALTER TABLE entries ADD COLUMN edited_at TEXT');
  } catch {
    // Column already exists — safe to ignore
  }

  // Migration: add rating column if it doesn't exist yet
  try {
    await db.execute('ALTER TABLE entries ADD COLUMN rating TEXT');
  } catch {
    // Column already exists — safe to ignore
  }

  // Migration: add investor_name column if it doesn't exist yet
  try {
    await db.execute('ALTER TABLE entries ADD COLUMN investor_name TEXT');
  } catch {
    // Column already exists — safe to ignore
  }

  console.log('Database initialized: mib.db');
}

module.exports = { db, init };
