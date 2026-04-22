# MIDB Database — Schema & Table Reference

## Engine
**SQLite 3** — file stored at `backend/mib.db`  
Pragmas enabled: `journal_mode = WAL` (better concurrent reads), `foreign_keys = ON`

---

## Table: `users`

Stores all registered user accounts.

```sql
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL UNIQUE,
  email       TEXT    NOT NULL UNIQUE,
  password    TEXT    NOT NULL,           -- bcrypt hash, never plain text
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

| Column     | Type    | Notes                                  |
|------------|---------|----------------------------------------|
| id         | INTEGER | Auto-increment primary key             |
| username   | TEXT    | Unique display name (shown on entries) |
| email      | TEXT    | Unique, stored lowercase               |
| password   | TEXT    | bcrypt hash (cost factor 10)           |
| created_at | TEXT    | ISO datetime, local machine time       |

**Used by:** auth routes (signup/login), entries (FK relationship, username display)

---

## Table: `entries`

Stores all submitted stock news entries. Core data table.

```sql
CREATE TABLE entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  entry_date    TEXT    NOT NULL,           -- user-selected date (YYYY-MM-DD)
  stock_name    TEXT    NOT NULL,           -- full stock name
  stock_symbol  TEXT    NOT NULL,           -- ticker symbol (uppercase)
  sector        TEXT    NOT NULL,           -- sector from stocks.json
  type          TEXT    NOT NULL,           -- one of 8 valid types
  source        TEXT    NOT NULL,           -- where the news came from
  news          TEXT    NOT NULL,           -- news content
  opinion       TEXT,                       -- optional user opinion/analysis
  rating        TEXT,                       -- optional: A/B/C/D, admin-only
  investor_name TEXT,                       -- optional: investor name if relevant
  submitted_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  edited_at     TEXT,                       -- set on every edit, null if never edited
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Column        | Type    | Notes                                                    |
|---------------|---------|----------------------------------------------------------|
| id            | INTEGER | Auto-increment primary key                               |
| user_id       | INTEGER | FK → users.id (who submitted this entry)                 |
| entry_date    | TEXT    | YYYY-MM-DD — the date the DATA refers to (user-chosen)   |
| stock_name    | TEXT    | Full company name e.g. "Reliance Industries Ltd."        |
| stock_symbol  | TEXT    | Ticker e.g. "RELIANCE" (always uppercase)                |
| sector        | TEXT    | Sector e.g. "Banking", "Crude Oil"                       |
| type          | TEXT    | One of 8 valid types (validated in route)                |
| source        | TEXT    | e.g. "Economic Times", "BSE Filing"                      |
| news          | TEXT    | Full news text (required)                                |
| opinion       | TEXT    | User's analysis/opinion (optional, nullable)             |
| rating        | TEXT    | A / B / C / D — admin-only, optional, nullable           |
| investor_name | TEXT    | Investor name if applicable (optional, nullable)         |
| submitted_at  | TEXT    | YYYY-MM-DD HH:MM:SS — server timestamp, auto-set on POST |
| edited_at     | TEXT    | YYYY-MM-DD HH:MM:SS — server timestamp, set on every PUT |

### Critical Distinction: Two Dates
- **`entry_date`** — The date the news/event belongs to. Chosen by the user. A user uploading old data on a different day will set this to the actual event date.
- **`submitted_at`** — When the entry was actually uploaded to the system. Set automatically by the server. Never editable.
- **`edited_at`** — When the entry was last edited. Null if never edited. Updated on every PUT.

### Valid `type` values
```
Published news | Rumors | Published Results | Recommendation |
Exchange fillings | Corporate actions | Promoter transactions | Bulk / Block deals
```

### Valid `rating` values
```
A | B | C | D
```
Rating can only be set or changed by admin users (`Aaryan`, `raunak bajaj`). Non-admin edits preserve the existing rating.

---

## Indexes

```sql
CREATE INDEX idx_entries_stock   ON entries(stock_symbol);
CREATE INDEX idx_entries_sector  ON entries(sector);
CREATE INDEX idx_entries_type    ON entries(type);
CREATE INDEX idx_entries_date    ON entries(entry_date);
CREATE INDEX idx_entries_user    ON entries(user_id);
```

These indexes speed up the most common search/filter operations.

---

## Relationships

```
users (1) ──────< entries (many)
  users.id = entries.user_id
```

Every entry is owned by exactly one user. When querying entries, the backend JOINs `users` to include `username` in the response.

---

## Date & Time Storage

SQLite has no native DATE/DATETIME type. All dates/times are stored as **TEXT in ISO 8601 format**:

| Field        | Format                | Example                   |
|--------------|-----------------------|---------------------------|
| entry_date   | `YYYY-MM-DD`          | `2026-04-04`              |
| submitted_at | `YYYY-MM-DD HH:MM:SS` | `2026-04-06 14:35:22`     |
| edited_at    | `YYYY-MM-DD HH:MM:SS` | `2026-04-08 09:42:11`     |
| created_at   | `YYYY-MM-DD HH:MM:SS` | `2026-04-06 09:10:05`     |

SQLite's built-in functions (`DATE()`, `DATETIME()`, `strftime()`) work natively on these formats.

**Example queries:**
```sql
-- Filter by date range
SELECT * FROM entries WHERE entry_date BETWEEN '2026-04-01' AND '2026-04-30';

-- Sort by upload time
SELECT * FROM entries ORDER BY submitted_at DESC;

-- Find entries by stock
SELECT * FROM entries WHERE stock_symbol = 'RELIANCE';

-- Find all A-rated entries
SELECT * FROM entries WHERE rating = 'A';
```

---

## Migrations

New columns are added via `ALTER TABLE` migration blocks in `database.js`. These run on every startup and are safe to re-run (errors are silently caught if the column already exists):

```js
// edited_at, rating, investor_name are added this way for existing databases
await db.execute('ALTER TABLE entries ADD COLUMN edited_at TEXT');
await db.execute('ALTER TABLE entries ADD COLUMN rating TEXT');
await db.execute('ALTER TABLE entries ADD COLUMN investor_name TEXT');
```

Fresh installs get all columns directly from the `CREATE TABLE` statement.

---

## Backup
To back up the entire database, copy `backend/mib.db` to any location. SQLite is a single file — no dump needed.

---

## Stocks Data (NOT in DB)
Stock reference data is NOT stored in the database.  
It lives in `backend/data/stocks.json` — 5421 stocks, 41 sectors.  
Source: `All_MainBoard_SME_Stocks.xlsx` (both MainBoard + SME sheets).  
The backend serves this as a static JSON API at `/api/stocks` and `/api/stocks/sectors`.
