# CashFlow — Web PWA

A mobile-first React + Vite PWA for the CashFlow API. Bottom tab navigation (Home, Transactions, Commitments, Categories), installable to a phone home screen, talks to the FastAPI backend via `@tanstack/react-query`.

## Stack

- React 18 + TypeScript, built with Vite 5
- `react-router-dom` for the four tabs
- `@tanstack/react-query` for data fetching/caching/invalidation
- `vite-plugin-pwa` for the manifest + service worker (installable, app-shell precached; API responses are never cached so data always stays fresh)
- Plain CSS (`src/index.css`), no UI component library — small bundle, light/dark aware, 44px touch targets

## Running locally

From the repo root, start the API first:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

Then, in `frontend/`:

```bash
npm install
npm run dev
```

Vite proxies `/api/*` to `http://127.0.0.1:8000` (see `vite.config.ts`), so the dev server and the API never need CORS configured against each other — everything is same-origin from the browser's point of view.

## Testing on your phone

`npm run dev` binds to all interfaces (`host: true`), so with your laptop and phone on the same Wi-Fi you can open one of the "Network" URLs Vite prints (e.g. `http://192.168.x.x:5173`) directly on the phone.

**If you're on WSL2** (this repo's dev environment is), WSL2's virtual network is NAT'd behind Windows and typically isn't reachable from other LAN devices out of the box — the "Network" IPs Vite prints from inside WSL2 usually won't work from your phone. Options:
- Run `npm run dev` from Windows (PowerShell) instead of inside WSL2, against the same repo via the `\\wsl$` path or a native Windows Node install.
- Or forward the port from Windows to WSL2: in an elevated PowerShell, `netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=<WSL2-IP>` (get `<WSL2-IP>` via `wsl hostname -I`), then browse to your Windows machine's LAN IP from the phone.

Once you can load the page on your phone, use the browser menu → "Add to Home Screen" to install it as a PWA.

## Build

```bash
npm run build
```

Requires Node ≥20 (developed against Node 24).

## Project structure

```
src/
├── api/
│   ├── types.ts     # mirrors app/schemas.py — note Decimal fields (amount, balance, …) are strings
│   ├── client.ts     # thin fetch wrapper, one function per endpoint
│   └── hooks.ts      # react-query hooks, handle cache invalidation across related queries
├── components/       # BottomNav, StatCard, AsyncState
├── pages/            # DashboardPage, TransactionsPage, CommitmentsPage, CategoriesPage
├── lib/format.ts      # currency/date formatting
└── index.css          # mobile-first styles, light/dark via prefers-color-scheme
```
