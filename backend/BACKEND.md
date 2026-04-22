# MIDB Backend — Full Context Guide

## Overview
Express.js REST API for the MIDB Stock News Tracker.  
Runs on **port 7777**, binds to `0.0.0.0` so all LAN devices can reach it.  
Database: SQLite (file: `mib.db` in the backend root folder).

---

## Tech Stack
| Package         | Purpose                                |
|-----------------|----------------------------------------|
| express         | HTTP server / routing                  |
| @libsql/client  | SQLite database (pure JS, async, no native compilation needed) |
| bcryptjs        | Password hashing (bcrypt, salt=10)     |
| jsonwebtoken    | JWT auth tokens (7-day expiry)         |
| cors            | Allow all origins (LAN use)            |
| nodemon         | Dev auto-restart                       |

> **Why @libsql/client instead of better-sqlite3?**  
> `better-sqlite3` requires C++ build tools (Visual Studio) to compile on Windows.  
> `@libsql/client` ships prebuilt WASM/native binaries — works on Windows out of the box.  
> Trade-off: all DB calls are async (Promise-based) instead of synchronous.

---

## Folder Structure
```
backend/
├── data/
│   └── stocks.json        ← 5421 stocks extracted from All_MainBoard_SME_Stocks.xlsx
├── db/
│   └── database.js        ← SQLite connection + table creation + migrations + indexes
├── middleware/
│   └── auth.js            ← JWT verification middleware
├── routes/
│   ├── auth.js            ← POST /api/auth/signup, POST /api/auth/login
│   ├── entries.js         ← CRUD + search for entries
│   └── stocks.js          ← GET /api/stocks, GET /api/stocks/sectors
├── mib.db                 ← SQLite database file (auto-created on first run)
├── server.js              ← App entry point, port 7777
├── package.json
├── BACKEND.md             ← This file
└── DATABASE.md            ← Database schema documentation
```

---

## How to Run

### First time setup
```bash
cd backend
npm install
npm run dev     # development (auto-restart)
# OR
npm start       # production
```

### What happens on startup
1. `server.js` loads
2. `db/database.js` connects to (or creates) `mib.db`
3. Tables are created if they don't exist (idempotent)
4. Migration blocks add any new columns to existing databases
5. Server listens on `0.0.0.0:7777`
6. Console prints both `localhost` and network IP

---

## API Endpoints

### Auth
| Method | Path               | Auth? | Description                    |
|--------|--------------------|-------|--------------------------------|
| POST   | /api/auth/signup   | No    | Create account, returns JWT    |
| POST   | /api/auth/login    | No    | Login, returns JWT             |

**Signup body:** `{ username, email, password }`  
**Login body:**  `{ email, password }`  
**Response:**    `{ token, username }`

### Entries
| Method | Path               | Auth? | Description                                      |
|--------|--------------------|-------|--------------------------------------------------|
| POST   | /api/entries       | Yes   | Submit a new entry                               |
| GET    | /api/entries       | No    | Get all entries (paginated + search/filter)      |
| GET    | /api/entries/:id   | No    | Get single entry                                 |
| PUT    | /api/entries/:id   | Yes   | Edit entry (admins or the entry's own uploader)  |
| DELETE | /api/entries/:id   | Yes   | Delete entry (admins or the entry's own uploader)|

**POST body:**
```json
{
  "entry_date":    "2026-04-04",
  "stock_name":    "Reliance Industries Ltd.",
  "stock_symbol":  "RELIANCE",
  "sector":        "Crude Oil",
  "type":          "Published news",
  "source":        "Economic Times",
  "news":          "...",
  "rating":        "A",
  "opinion":       "...",
  "investor_name": "..."
}
```
`rating`, `opinion`, and `investor_name` are optional. `rating` is admin-only (ignored silently for non-admins on PUT).

**GET query params (all optional):**
- `q`         — keyword search across news, opinion, source, stock name/symbol, username
- `stock`     — filter by symbol or name (partial match)
- `sector`    — filter by sector (exact match)
- `type`      — filter by type (exact match)
- `source`    — filter by source (exact match)
- `rating`    — filter by rating (A / B / C / D)
- `date_from` — filter entry_date >= (YYYY-MM-DD)
- `date_to`   — filter entry_date <= (YYYY-MM-DD)
- `page`      — page number (default: 1)
- `limit`     — results per page (default: 20)

### Stocks
| Method | Path                 | Auth? | Description                      |
|--------|----------------------|-------|----------------------------------|
| GET    | /api/stocks          | No    | All stocks (optionally ?sector=) |
| GET    | /api/stocks/sectors  | No    | Array of all unique sectors      |

---

## Auth Flow
1. User signs up → password bcrypt-hashed → stored in `users` table
2. Login → password compared → JWT issued (7 days, secret in `middleware/auth.js`)
3. Protected routes require `Authorization: Bearer <token>` header
4. `req.user` = `{ id, username }` after middleware runs

---

## Admin Access
Two users have elevated privileges (hardcoded in `routes/entries.js`):
```js
const ADMINS = ['Aaryan', 'raunak bajaj'];
```
Admins can: edit any entry (including the `rating` field), delete any entry.  
Non-admin users can: edit and delete only their own entries, but cannot change `rating`.

---

## Valid Entry Types
- Published news
- Rumors
- Published Results
- Recommendation
- Exchange fillings
- Corporate actions
- Promoter transactions
- Bulk / Block deals

## Valid Rating Values
`A`, `B`, `C`, `D` — optional field, settable only by admins.

---

## Stocks Data
Source: `All_MainBoard_SME_Stocks.xlsx` (provided by user)  
- **5421 stocks** total (4387 MainBoard + 1034 SME)
- **41 unique sectors**
- Fields per stock: `name`, `symbol`, `sector`, `industry`, `exchange`, `board`
- Stored in `data/stocks.json` — served statically, NOT in the database
- To update stocks: re-run the Python extraction script and replace `data/stocks.json`

---

## Environment / Config
- `JWT_SECRET`: defaults to `mib_secret_key_2026`. Set via environment variable in production.
- No `.env` file currently used — safe for LAN-only deployment.
- `cors` is set to allow all origins (`*`) — appropriate for local network.

---

## Key Design Decisions
- **SQLite over PostgreSQL/MySQL**: No server setup, perfect for ≤50 users, file-based backup.
- **@libsql/client over better-sqlite3**: Avoids C++ build tools requirement on Windows. All DB calls are async.
- **Stocks in JSON not DB**: 5421 rows are read-only reference data; JSON file is faster and simpler.
- **Dates stored as TEXT** in ISO format (`YYYY-MM-DD` / `YYYY-MM-DD HH:MM:SS`) — SQLite supports date functions on TEXT.
- **Two timestamps per entry**: `entry_date` (user-chosen) vs `submitted_at` (auto server time) — critical distinction.
- **`edited_at` column**: Set on every PUT, never on POST. Lets the UI show when an entry was last modified.
