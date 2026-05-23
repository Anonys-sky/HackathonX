# SquirryCoach — AI Wealth Coach

Gamified personal finance for students and young adults in Malaysia. Track spending in **ringgit**, build savings streaks, and let **Squirry** (your AI squirrel buddy) plan budgets, parse messy bank text, and nudge you before you overspend.

Built for **HackathonX** — full-stack PWA with **Continue without login** for judges and demos.

---

## The problem

Students know they should budget, but most apps feel like homework: manual entry, charts in percentages, and no one tells you **how much money you have left today** in plain RM.

## Our solution

| Pain | SquirryCoach answer |
|------|---------------------|
| Messy Grab / e-wallet text | **AI transaction parser** — paste raw text, get categorized rows |
| Lazy to fill budget forms | **Chat budget planner** — talk to Squirry; it fills Food, Groceries, etc. in RM |
| Easy to forget saving | **Gamification** — XP, levels, streaks, social leaderboard |
| “How much can I spend?” | **Dashboard** — large Saving / Spending donuts with **RM left** per wallet |
| Need a nudge | **Squirry bubble** on home — save reminders, overspend warnings, celebration after logging |

---

## Features

- **Continue without login** — judges start instantly as a demo guest
- **Onboarding** — custom wallet split with 50/30/20 recommendation  
- **Dashboard** — Saving vs Spending allocation charts, search, daily date, Squirry nudges  
- **Activity** — ledger + AI parser for bank/e-wallet paste  
- **Wealth → Budget** — calendar daily plan, AI chat fills category amounts  
- **Goals** — savings goals with progress  
- **Social** — streaks and friend leaderboard  
- **i18n** — English & Bahasa Malaysia  

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion |
| API | REST (`/api/*`) via React Query shim (replaces tRPC client-side) |
| Backend | **Python FastAPI** + Uvicorn |
| Data | **Local JSON** (`DATA_BACKEND=local`, default) or **Firebase Firestore** |
| AI | OpenAI-compatible API (`gpt-4o-mini` default) + **offline fallback** when quota fails |
| Legacy (optional) | Node + Express + tRPC + MySQL — `npm run dev:legacy` |

---

## Quick start

### Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.10+** with `pip`

### Run locally

```bash
cd SquirrelSave
cp .env.example .env
# Add LLM_API_KEY (or keep LLM_FALLBACK_ENABLED=true for demo)
pip install -r backend/requirements.txt
npm install --legacy-peer-deps
npm run dev
```

This starts:

- **API** — http://127.0.0.1:8000 (FastAPI)
- **Web** — http://localhost:3000 (Vite; proxies `/api` to the API)

On the **Home** screen, tap **Continue without login** (or complete onboarding as the demo guest).

See [SETUP.md](./SETUP.md) for troubleshooting, Groq as a free LLM, and Firebase.

---

## Environment variables

Copy `.env.example` → `.env`. Never commit secrets.

| Variable | Purpose |
|----------|---------|
| `DATA_BACKEND` | `local` (JSON file) or `firebase` (Firestore) |
| `DEMO_USER_ID` | Guest user id for judge/demo mode |
| `LLM_API_URL` | OpenAI or compatible base URL |
| `LLM_API_KEY` | API key for coach + parser |
| `LLM_MODEL` | e.g. `gpt-4o-mini` |
| `LLM_FALLBACK_ENABLED` | `true` = local coach/parser when API fails |
| `FIREBASE_PROJECT_ID` | Required when `DATA_BACKEND=firebase` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON (one line) for Firestore |
| `VITE_APP_NAME` | Brand name in UI (default `SquirryCoach`) |
| `DEFAULT_CURRENCY` | e.g. `RM` |

---

## Project structure

```
SquirrelSave/
├── backend/
│   ├── app/main.py           # FastAPI routes
│   ├── app/store/            # local JSON + Firestore adapters
│   └── app/services/         # LLM, gamification, spending
├── client/src/
│   ├── pages/                # Route screens
│   ├── components/           # UI, Squirry, activity, dashboard
│   └── lib/api/              # REST client + tRPC-compatible hooks
├── shared/                   # Config, schemas, gamification, budget planner
├── server/                   # Legacy Node/tRPC (optional)
└── dist/public/              # Vite build (served by FastAPI in production)
```

---

## Development

```bash
npm run dev          # FastAPI :8000 + Vite :3000
npm run dev:legacy   # Old Node + MySQL stack
npm run check        # TypeScript
npm test             # Vitest (shared + legacy router tests)
npm run build        # Production client bundle
npm start            # Uvicorn serves API + static dist
```

### Adding a feature

1. **API** — add route in `backend/app/main.py` and store methods in `backend/app/store/`
2. **Client** — extend `client/src/lib/api/client.ts` and `trpc-shim.ts`
3. **UI** — `client/src/pages/` + hooks

Demo mode sends `X-Demo-Mode: true` and uses `DEMO_USER_ID` — no Firebase Auth required for judges.

---

## Demo flow (for judges)

1. **Home** → **Continue without login**  
2. **Onboarding** or **Dashboard** — Saving / Spending in RM; read Squirry nudge  
3. **Activity → AI Parser** — paste sample transaction text  
4. **Wealth → Budget** — “Plan my budget for today” → Squirry fills amounts  
5. **Goals / Social** — savings target + streaks  

---

## Deployment notes

- **Full stack**: deploy FastAPI (`npm start` after `npm run build`) on Railway, Render, Fly.io, etc. The API serves the built SPA from `dist/public`.
- **Vercel (frontend only)**: set `VITE_API_URL` to your hosted API origin; Vercel cannot run the Python API in the same project by default.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | FastAPI + Vite (recommended) |
| `npm run dev:legacy` | Node + embedded MySQL |
| `npm run test` | Unit tests |
| `npm run check` | `tsc --noEmit` |
| `npm run build` | Build client for production |
| `npm start` | Production API + static files |

---

## License

MIT — see [package.json](./package.json).

---

**SquirryCoach** — finance that feels like texting a friend, not doing accounting.

Questions or setup issues → [SETUP.md](./SETUP.md).
