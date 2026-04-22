# MIDB Frontend — Full Context Guide

## Overview
React (Vite) single-page app for the MIDB Stock News Tracker.  
Runs on **port 8080**, binds to `0.0.0.0` so all LAN users can access it.
> Port 6666 was the original request but browsers (Chrome, Firefox, Edge) block it at the browser level — it's on their "unsafe ports" list due to IRC association. Port 8080 is the standard safe alternative.  
Backend API is at **port 7777** (proxied via Vite in dev mode).

---

## Tech Stack
| Package          | Purpose                                  |
|------------------|------------------------------------------|
| react 18         | UI framework                             |
| react-router-dom | Client-side routing (v6)                 |
| axios            | HTTP requests to backend API             |
| vite             | Dev server + build tool                  |
| @vitejs/plugin-react | React JSX transform for Vite        |

---

## Folder Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          ← Top navigation bar (shown only when logged in)
│   │   └── StockSelector.jsx   ← Sector filter + searchable stock dropdown
│   ├── pages/
│   │   ├── Login.jsx           ← Login form page
│   │   ├── Signup.jsx          ← Signup form page
│   │   ├── Submit.jsx          ← Main data entry form (/)
│   │   └── Search.jsx          ← Search & view all entries (/search)
│   ├── App.jsx                 ← Route definitions + auth guard
│   ├── main.jsx                ← React entry point
│   └── index.css               ← All global styles (single CSS file, no framework)
├── index.html
├── vite.config.js              ← Port 6666, proxy /api → localhost:7777
├── package.json
└── FRONTEND.md                 ← This file
```

---

## How to Run

### First time setup
```bash
cd frontend
npm install
npm run dev     # development server at http://localhost:6666
```

### Access from other machines on LAN
Other users open: `http://<your-machine-IP>:6666`  
(Backend must also be running at port 7777)

---

## Pages & Routing

| Route     | Component    | Auth Required | Description                          |
|-----------|--------------|---------------|--------------------------------------|
| /login    | Login.jsx    | No (redirects if logged in) | Email + password login |
| /signup   | Signup.jsx   | No (redirects if logged in) | Create new account     |
| /         | Submit.jsx   | Yes           | Submit new stock news entry          |
| /search   | Search.jsx   | Yes           | Search and browse all entries        |
| *         | —            | —             | Redirects to /                       |

### Auth Guard
`App.jsx` wraps protected routes in `<PrivateRoute>`.  
Auth state is determined by presence of `mib_token` in `localStorage`.  
If token is missing/expired → redirect to `/login`.

---

## Authentication
- Token storage: `localStorage` keys `mib_token` and `mib_username`
- Token is a JWT issued by backend (7-day expiry)
- All protected API calls include header: `Authorization: Bearer <token>`
- Logout: clears both localStorage keys, redirects to `/login`

---

## Components

### `Navbar.jsx`
- Only rendered when user is logged in (conditional in `App.jsx`)
- Shows: brand name, Submit link, Search link, username, Logout button
- Active link highlighted with `.active` class

### `StockSelector.jsx`
A two-step stock selection component used in the Submit form.

**How it works:**
1. User optionally selects a **sector** from a dropdown (fetched from `/api/stocks/sectors`)
2. User types in a **search box** (name or symbol)
3. Results fetched from `/api/stocks?sector=...` and filtered client-side
4. Up to 80 results shown in a dropdown overlay
5. Selecting a stock calls `onChange({ stock_name, stock_symbol, sector })`

**Props:**
- `value` — current selection `{ stock_name, stock_symbol, sector }` or `null`
- `onChange` — callback with selected stock object or `null` (when cleared)

---

## Pages Detail

### `Submit.jsx` (/)
The main data entry form. Mirrors the original Google Form fields:

| Field      | Input Type    | Required | Notes                                         |
|------------|---------------|----------|-----------------------------------------------|
| Date       | `<input date>`| Yes      | User picks the data's date (not upload time)  |
| Stock      | StockSelector | Yes      | Sector filter + search autocomplete           |
| Type       | `<select>`    | Yes      | 8 predefined options                          |
| Source     | `<input text>`| Yes      | e.g. "Economic Times"                         |
| News       | `<textarea>`  | Yes      | Full news content                             |
| Opinion    | `<textarea>`  | No       | Optional analysis                             |

- `submitted_at` and `username` are NOT shown — backend handles them automatically.
- On success: shows green alert, resets form with today's date.
- On error: shows red alert with error message.

### `Search.jsx` (/search)
Search and browse all entries in the database.

**Filters:**
- Keyword (`q`) — searches across news, opinion, source, stock name/symbol
- Stock symbol — exact/partial match
- Type — dropdown of 8 types
- Date from / Date to — filters `entry_date` range

**Results table columns:**
- Date (entry_date, formatted DD-MM-YYYY)
- Stock (symbol + sector badge)
- Type (colored badge)
- Source (truncated)
- News (truncated)
- Submitted By (username, highlighted)
- Uploaded (submitted_at timestamp)
- Delete button (only shown for own entries)

**Click a row** to expand full details (news, opinion, sector, full stock name).

**Pagination:** 20 results per page, numbered page buttons.

---

## Styling
Single CSS file: `src/index.css`  
No CSS framework (no Tailwind, no Bootstrap) — custom CSS variables.

Key CSS variables:
```css
--primary:  #2563eb   (blue)
--danger:   #dc2626   (red)
--success:  #16a34a   (green)
--bg:       #f1f5f9   (light gray page background)
--card:     #ffffff   (white cards)
--border:   #e2e8f0
--text:     #1e293b
--muted:    #64748b
```

---

## Vite Proxy (dev mode)
`vite.config.js` proxies `/api/*` → `http://localhost:7777`.  
This means all `axios.get('/api/...')` calls go to the backend without CORS issues in dev.  
In production, you'd configure a reverse proxy (nginx, etc.) or use the full URL.

---

## Key Design Decisions
- **No state management library**: React `useState` + `useEffect` is sufficient for this scale.
- **No component library**: Custom CSS keeps bundle small and avoids dependency bloat.
- **StockSelector debounces** search by 250ms to avoid hammering the API.
- **Stocks fetched from API** not bundled in frontend — keeps the 5421-stock JSON server-side.
- **Two timestamps**: `entry_date` is user-chosen; `submitted_at` is auto-set. Both displayed in Search.
- **Token in localStorage**: Simple for a LAN app. For internet-facing apps, consider httpOnly cookies.
