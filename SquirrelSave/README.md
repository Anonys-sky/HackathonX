# SquirryCoach — AI Wealth Coach

Gamified personal finance for **students and young adults in Malaysia**. Track spending in **ringgit (RM)**, see **how much you can spend today**, build **budget streaks**, and let **Squirry** help you plan, scan receipts, and stay on track.

Built for **HackathonX** — mobile-first **PWA** with **Continue without login** for judges and demos.

---

## The problem

Young adults in Malaysia often hit mid-month with little left in the bank, avoid checking balances, and lose track of small daily spends (Grab, TnG, Shopee). Most finance apps feel like homework: manual entry, charts in percentages, and no plain answer to **“how much can I spend today?”**

## Our solution

| Pain | SquirryCoach answer |
|------|---------------------|
| Messy bank / e-wallet alerts | **Smart Scan** — paste text or **photo OCR** (Tesseract.js in browser) |
| Lazy to fill budget forms | **Wealth → Budget** — chat with Squirry; daily sheet fills in RM by category |
| Easy to forget saving | **XP, levels, streaks**, and a **League** ranked by discipline (not wealth) |
| “How much can I spend?” | **Safe to Spend Today** — spending wallet remaining ÷ days left in month |
| Need a nudge | **Squirry coach** — overspend alerts + tips (LLM when configured, smart local fallback otherwise) |

---

## How it works

```
User input          Processing                         Output
──────────          ──────────                         ──────
Manual log          On-device rules (browser)          Safe to Spend Today (RM)
Smart Scan (OCR     Weather + exam context             Context-adjusted daily limit
  or paste SMS)     Optional LLM coach               Streak Pot (XP stakes)
Onboarding          Budget math                        League, Goals, XP, alerts
(50/30/20 split)
```

### Hackathon MVP innovations

1. **Streak Pot (Anti-Budget)** — Social → wager **50 XP** with friends (Danial & Aiman demo). Stay under **Safe to Spend** or forfeit XP to winners. *Gamified accountability — no real money.*
2. **Context engine** — Open-Meteo rain near **Gelugor** + exam-period buffer lowers today's Safe to Spend with Squirry nudges.
3. **Zero-trust scan** — Tesseract OCR + `parseBankText` run **in the browser**; only confirmed rows are sent to the API.

**Honest AI model:** Core flows work **without API keys**. Connect **Gemini / Groq** to enhance coach & budget chat when credits are available.

---

## Features

### Home & onboarding
- **Continue without login** — instant demo guest for judges
- **Onboarding** — monthly income (RM), wallet split with **50/30/20** recommendation

### Dashboard
- **Safe to Spend Today** — daily RM you can still spend (may be **lowered** for rain / exam buffer)
- **Context banner** — predictive nudges (weather, finals week)
- **Saving / Spending** progress donuts with **RM left** per allocation
- **Monthly income** card, XP bar, streak, Squirry nudges
- **Log Transaction** FAB → Activity

### Activity
- Date-grouped transaction feed
- **Manual log** — numpad, merchant, required category chips
- **Smart Scan** — paste bank/e-wallet text **or** receipt/screenshot **OCR** (client-side)

### Wealth Coach
- **Budget** — weekly calendar ribbon, daily summary card, WhatsApp-style **AI budget buddy** chat
- **Progress** — level card, daily action checklist, XP history grouped by day
- **Invest** — educational platform cards (Versa, StashAway, Wahed, Luno) with disclaimers

### Social
- **League** — leaderboard by **budget streak days** (friends + campus demo tab)
- Badges sheet, add friend, poke/remind

### Goals
- Savings goals with progress and add funds

### Other
- **English & Bahasa Malaysia** (i18n)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | **React 19 + Vite** PWA (mobile-first; works in phone browser) |
| **UI** | Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion |
| **API client** | REST (`/api/*`) + React Query (tRPC-compatible shim) |
| **Backend** | **Python FastAPI** + Uvicorn |
| **Data** | **Local JSON** (default, `DATA_BACKEND=local`) or **Firebase Firestore** (`DATA_BACKEND=firebase`) |
| **Scan** | **Tesseract.js** (browser OCR) + heuristic text parser |
| **Intelligence** | **Rules / heuristics** + optional **LLM** (Gemini/Groq/OpenAI-compatible) for coach & budget chat |
| **Deploy** | Vercel (static PWA + Python serverless `/api`) or Railway/Render/Fly (full FastAPI + static) |
| **Legacy (optional)** | Node + Express + tRPC + MySQL — `npm run dev:legacy` |

---

## Quick start

### Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.10+** with `pip`

### Run locally

```bash
cd SquirrelSave
cp .env.example .env
# Optional: LLM_API_KEY — or keep LLM_LOCAL_ONLY=true for offline coach/parser
pip install -r backend/requirements.txt
npm install --legacy-peer-deps
npm run dev
```

This starts:

- **API** — http://127.0.0.1:8000 (FastAPI)
- **Web** — http://localhost:3000 (Vite; proxies `/api` to the API)

On **Home**, tap **Continue without login**, then complete onboarding or open the dashboard.

See [SETUP.md](./SETUP.md) for troubleshooting, Groq/Gemini keys, and Firestore setup.

---

## Environment variables

Copy `.env.example` → `.env`. Never commit secrets.

| Variable | Purpose |
|----------|---------|
| `DATA_BACKEND` | `local` (JSON file) or `firebase` (Firestore) |
| `DEMO_USER_ID` | Guest user id for judge/demo mode |
| `LLM_API_URL` | OpenAI-compatible base URL (Gemini, Groq, etc.) |
| `LLM_API_KEY` | API key for coach + budget planner |
| `LLM_MODEL` | e.g. `gemini-2.0-flash` |
| `LLM_FALLBACK_ENABLED` | `true` = heuristic/local replies when API fails |
| `LLM_LOCAL_ONLY` | `true` = skip remote LLM (demo-friendly) |
| `FIREBASE_PROJECT_ID` | Required when `DATA_BACKEND=firebase` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON (one line) for Firestore |
| `VITE_API_URL` | Production API origin (if frontend hosted separately) |
| `VITE_APP_NAME` | Brand name in UI (default `SquirryCoach`) |
| `DEFAULT_CURRENCY` | e.g. `RM` |

---

## Project structure

```
SquirrelSave/
├── api/                      # Vercel serverless entry (wraps FastAPI)
├── backend/
│   ├── app/main.py           # FastAPI routes
│   ├── app/store/            # local JSON + Firestore adapters
│   └── app/services/         # LLM, heuristics, gamification, spending
├── client/src/
│   ├── pages/                # Home, Dashboard, Activity, Social, Wealth, Goals
│   ├── components/           # dashboard/, activity/, social/, wealth/
│   └── lib/
│       ├── api/              # REST client + React Query shim
│       ├── receiptOcr.ts     # Tesseract.js wrapper
│       └── budgetCycle.ts    # Safe to spend, wallet math
├── shared/                   # Config, budget planner categories, coach nudges
├── server/                   # Legacy Node/tRPC (optional)
└── dist/public/              # Vite production build
```

---

## Development

```bash
npm run dev          # FastAPI :8000 + Vite :3000 (recommended)
npm run dev:legacy   # Old Node + MySQL stack
npm run check        # TypeScript
npm test             # Vitest
npm run test:api     # pytest (backend)
npm run build        # Production client bundle
npm start            # Uvicorn serves API + static dist
```

### Adding a feature

1. **API** — route in `backend/app/main.py`, persistence in `backend/app/store/`
2. **Client** — `client/src/lib/api/client.ts` and `trpc-shim.ts`
3. **UI** — `client/src/pages/` and `client/src/components/`

Demo mode sends `X-Demo-Mode: true` and uses `DEMO_USER_ID` — no Firebase Auth required for judges.

---

## Demo flow (for judges)

1. **Home** → **Continue without login**
2. **Onboarding** — income + wallet split (or skip if already complete)
3. **Dashboard** — note **Safe to Spend Today** and Saving/Spending donuts (RM)
4. **Activity** → **Smart Scan** — paste sample TnG/Grab text or upload a receipt image
5. **Activity** → **Manual log** — amount + category in three taps
6. **Wealth → Budget** — “Plan my budget for today” → Squirry fills daily categories
7. **Social → Streak Pot** — stake 50 XP, check in, settle week (winners earn XP)
8. **Social → League** — streak ranking (not account balance)
9. **Goals** — create or view a savings target

**Sample paste for Smart Scan:**

```
TNG*SHP MYR 15.50
GRAB FOOD 23.80
MBB PETRON 45.00
```

---

## Deployment

### Vercel (this repo)

`vercel.json` builds the PWA and routes `/api/*` to the Python function (`api/index.py`). SPA routes rewrite to `index.html`.

```bash
npm run build
# Deploy from SquirrelSave/ (or monorepo root with root vercel.json)
```

### Full stack (Railway, Render, Fly.io)

```bash
npm run build
npm start   # FastAPI serves dist/public + /api
```

Set `DATA_BACKEND=firebase` and Firestore credentials for persistent multi-user data in production.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | FastAPI + Vite (recommended) |
| `npm run dev:legacy` | Node + embedded MySQL |
| `npm run test` | Vitest (client/shared) |
| `npm run test:api` | pytest (backend) |
| `npm run check` | `tsc --noEmit` |
| `npm run build` | Build client for production |
| `npm start` | Production API + static files |

---

## License

MIT — see [package.json](./package.json).

---

**SquirryCoach** — finance that feels like texting a friend, not doing accounting.

Setup help → [SETUP.md](./SETUP.md).
