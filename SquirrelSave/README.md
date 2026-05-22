# SquirryCoach — AI Wealth Coach

Gamified personal finance for students and young adults in Malaysia. Track spending in **ringgit**, build savings streaks, and let **Squirry** (your AI squirrel buddy) plan budgets, parse messy bank text, and nudge you before you overspend.

Built for **HackathonX** — full-stack PWA with no login required for demos.

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
| API | tRPC + Superjson |
| Backend | Express (Node), TypeScript |
| Database | MySQL via Drizzle ORM |
| AI | OpenAI-compatible API (`gpt-4o-mini` default) + **offline fallback** when quota fails |
| Local dev | Embedded MySQL (`AUTO_START_MYSQL`) — no Docker required |

---

## Quick start

### Prerequisites

- Node.js 18+  
- npm  

### Run locally

```bash
cd SquirrelSave
cp .env.example .env
# Add your LLM_API_KEY (or rely on LLM_FALLBACK_ENABLED for demo)
npm install --legacy-peer-deps
npm run dev
```

Wait for:

```
[MySQL] Migrations applied
✓ Server running — open http://localhost:3000/
```

Open the URL in your browser. A **guest user** is created automatically — no sign-in.

See [SETUP.md](./SETUP.md) for troubleshooting, Groq as a free LLM, and Docker MySQL.

---

## Environment variables

Copy `.env.example` → `.env`. Never commit secrets.

| Variable | Purpose |
|----------|---------|
| `LLM_API_URL` | OpenAI or compatible base URL |
| `LLM_API_KEY` | API key for coach + parser |
| `LLM_MODEL` | e.g. `gpt-4o-mini` |
| `LLM_FALLBACK_ENABLED` | `true` = local coach/parser when API fails |
| `AUTO_START_MYSQL` | `true` = embedded MySQL on first run |
| `DATABASE_URL` | MySQL connection (optional if auto-start) |
| `VITE_APP_NAME` | Brand name in UI (default `SquirryCoach`) |
| `DEFAULT_CURRENCY` | e.g. `RM` |

---

## Project structure

```
SquirrelSave/
├── client/src/
│   ├── pages/              # Route screens (thin orchestration)
│   ├── components/
│   │   ├── activity/       # Parser, modals, skeleton
│   │   ├── dashboard/      # Donut cards, skeleton
│   │   └── …               # SquirryMascot, BudgetPlannerView, UI
│   ├── hooks/              # useTransactionCache, useTranslation
│   └── lib/                # trpc, currency, i18n
├── server/
│   ├── routers/            # tRPC by domain (auth, profile, transactions, coach, …)
│   ├── routers.ts          # Re-exports appRouter
│   ├── db.ts               # Drizzle queries
│   └── lib/                # AI, spendingStats, walletContext
├── shared/                 # Config, schemas, gamification, budget planner
├── drizzle/                # Schema + SQL migrations
└── server/_core/           # Express + Vite dev server bootstrap
```

---

## Development

```bash
npm run dev        # Start app (port 3000 or next free)
npm run check      # TypeScript
npm test           # Vitest (routers, LLM fallback, budget planner)
npm run build      # Production client + server bundle
```

### Adding a feature

1. Schema — `drizzle/schema.ts` → apply SQL / `npm run db:push`  
2. DB helpers — `server/db.ts`  
3. tRPC procedures — `server/routers/<domain>.ts` (merged in `server/routers/index.ts`)  
4. UI — `client/src/pages/` + `trpc.*` hooks  

Auth in hackathon mode: every request uses a shared guest user (`server/_core/guestUser.ts`). `protectedProcedure` does not require login.

---

## Demo flow (for judges)

1. **Home** → start onboarding or dashboard  
2. **Dashboard** — Saving / Spending in RM; read Squirry nudge  
3. **Activity → AI Parser** — paste sample transaction text  
4. **Wealth → Budget** — “Plan my budget for today” → Squirry fills amounts  
5. **Goals / Social** — savings target + streaks  

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server + Vite HMR |
| `npm run dev:watch` | Dev with file watch on server |
| `npm run test` | Unit tests |
| `npm run check` | `tsc --noEmit` |
| `npm run build` | Build for production |
| `npm run db:up` | Docker MySQL (optional) |

---

## License

MIT — see [package.json](./package.json).

---

## Team / hackathon

**SquirryCoach** — finance that feels like texting a friend, not doing accounting.

Questions or setup issues → [SETUP.md](./SETUP.md).
