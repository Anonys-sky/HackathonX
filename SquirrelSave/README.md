# SquirryCoach — AI Wealth Coach

Gamified personal finance for **students and young adults in Malaysia**. Track spending in **ringgit (RM)**, see **how much you can spend today**, build **budget streaks**, and let **Squirry** help you plan, scan receipts, and stay on track.

Built for **HackathonX** — mobile-first **PWA** with **Continue without login** for judges and demos.

---

## The problem

*Aligned with our pitch deck — a real problem most **young adults in Malaysia** face today.*

### The avoidance cycle

Many students don’t run out of money on day one — they run out **mid-month**:

1. **Money runs low** — allowance, part-time pay, or PTPTN doesn’t stretch to month-end.
2. **The banking app hurts** — opening it shows something like **RM 12.50** left and a falling balance.
3. **They stop looking** — low balance feels worse, so they **avoid checking** and hope it sorts itself out.

Small daily spends (Grab, TnG, Shopee, bubble tea) keep going; the shock only comes later.

### Four pains we hear (emotional)

| Pain | What it means |
|------|----------------|
| **No idea how to budget** | They don’t know how to plan money across the month in plain RM. |
| **Spend without knowing where it goes** | Small expenses add up; they only notice when it’s too late. |
| **Don’t know how to save wisely** | They want to save but don’t know how much, where, or how to start. |
| **Wallet empty before month-end** | Money is gone early; they survive until the next allowance or PTPTN. |

### Four complications (why apps fail them)

| # | Complication | What happens |
|---|--------------|--------------|
| **01** | **Too many banks & e-wallets** | Finances spread across Maybank, Touch ’n Go, Boost, GrabPay, etc. — no single view. |
| **02** | **Manual tracking** | Recording and calculating every spend feels like homework. |
| **03** | **Poor categorisation** | Bank labels (“Transport? Shopping? Others?”) don’t match real student life. |
| **04** | **Saving alone feels lonely** | No motivation or accountability — easy to quit. |

**What they need:** a **smarter, kinder, and more motivating** way to manage money and build habits — not another scary spreadsheet.

---

## Our solution

SquirryCoach is a **gamified AI-powered** personal finance **PWA** for **students and young adults in Malaysia**, focused on **Saving · Spending · Budgeting** in **ringgit**, with a friendly squirrel coach.

| Problem (from deck) | SquirryCoach answer |
|---------------------|---------------------|
| Too many banks & e-wallets | **Smart Scan** — paste alerts or **OCR** a screenshot; one feed in **Activity** (parsed on your phone) |
| Manual tracking | **Manual log** (numpad + categories) + scan-first flow; no ledger homework |
| Poor categorisation | **Keyword rules** on-device + optional LLM; Malaysian merchants (Grab, TnG, etc.) |
| Saving alone feels lonely | **League** (streak rank, not richest user) + **Streak Pot** (wager **XP**, not real money) |
| Don’t know how to budget | **Wealth → Budget** — chat fills daily categories in RM; **50/30/20** onboarding |
| “How much can I spend today?” | **Safe to Spend Today** — spending wallets ÷ days left in month |
| Avoid checking / need motivation | **Squirry nudge** on Dashboard — budget tips + rain/exam context; dismiss ×, **tap squirrel to reopen** |
| Want kinder guidance | Coach tone + XP/levels; works with **`LLM_LOCAL_ONLY=true`** when no API credits |

---

## How it works

```
┌─────────────────────────────────────────────────────────────────┐
│  USER INPUT          PROCESSING              OUTPUT              │
├─────────────────────────────────────────────────────────────────┤
│  Manual log          On-device parse (rules)   Safe to Spend (RM) │
│  Smart Scan OCR      Open-Meteo + exam rules   Adjusted daily cap │
│  Onboarding 50/30/20 Optional LLM coach       Streak Pot (XP)    │
│  Paste bank SMS      FastAPI + local JSON      League, Goals, XP  │
└─────────────────────────────────────────────────────────────────┘
```

**Privacy-first scan:** Receipt images and pasted text are parsed in the **browser**. Only transactions you confirm are sent to the server.

**Honest AI:** Set `LLM_LOCAL_ONLY=true` (default-friendly) for heuristic coach + budget replies. Add **Gemini / Groq** API keys to enable full LLM when credits are available.

### Hackathon differentiators

1. **Streak Pot (Anti-Budget)** — Wager **50 XP** (not real money) with demo friends. Stay under **Safe to Spend** or forfeit XP to winners on weekly settle.
2. **Context engine** — Rain near **Gelugor** (Open-Meteo) + **finals-week buffer** can lower today’s Safe to Spend; explained inside the **Squirry nudge** on Dashboard.
3. **Zero-trust edge scan** — `shared/parseBankText.ts` + Tesseract.js; no receipt upload for parsing.

---

## Features by screen

| Screen | Highlights |
|--------|------------|
| **Home** | Continue without login, EN / BM |
| **Onboarding** | Monthly income (RM), wallet split with **50/30/20** tip |
| **Dashboard** | Safe to Spend (context-adjusted), saving/spending donuts, XP bar, FAB → Activity, **Squirry nudge** (dismiss ×, tap mascot to reopen) |
| **Activity** | Date-grouped feed, **Manual log** (numpad + categories), **Smart Scan** (OCR or paste, on-device parse) |
| **Wealth** | **Budget** (weekly ribbon + AI chat), **Progress** (XP checklist), **Invest** (educational partners + disclaimer) |
| **Social** | **Streak Pot** (XP stakes), **League** (streak rank), badges, add friend, poke |
| **Goals** | Savings targets, add funds |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion |
| **Mobile** | Mobile-first PWA (~430px layouts), works in phone browser |
| **API** | REST `/api/*` + React Query (tRPC-compatible shim) |
| **Backend** | Python 3.10+, FastAPI, Uvicorn |
| **Data** | Local JSON (`DATA_BACKEND=local`, default) or Firebase Firestore |
| **OCR** | Tesseract.js (client-only) |
| **Intelligence** | Heuristic categorization + optional OpenAI-compatible LLM |
| **Deploy** | Vercel (`vercel.json`: SPA + Python `/api`) or `npm start` (full stack) |

---

## Quick start

### Prerequisites

- **Node.js 18+**, **npm**
- **Python 3.10+**, **pip**

### One-command dev

```bash
cd SquirrelSave
cp .env.example .env
pip install -r backend/requirements.txt
npm install --legacy-peer-deps
npm run dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://127.0.0.1:8000 |

On **Home** → **Continue without login** → complete **Onboarding** or open **Dashboard**.

More help: [SETUP.md](./SETUP.md)

---

## Environment variables

Copy `.env.example` → `.env`. Never commit secrets.

| Variable | Purpose |
|----------|---------|
| `DATA_BACKEND` | `local` (JSON) or `firebase` |
| `DEMO_USER_ID` | Guest user for judge/demo mode |
| `LLM_API_URL` / `LLM_API_KEY` / `LLM_MODEL` | Gemini, Groq, or OpenAI-compatible |
| `LLM_FALLBACK_ENABLED` | `true` = local replies when API fails |
| `LLM_LOCAL_ONLY` | `true` = no remote LLM (recommended for demos) |
| `FIREBASE_*` | When using Firestore |
| `VITE_API_URL` | Production API URL if frontend is separate |
| `VITE_APP_NAME` | Brand in UI (default `SquirryCoach`) |
| `DEFAULT_CURRENCY` | `RM` |

---

## Project structure

```
SquirrelSave/
├── api/index.py              # Vercel serverless → FastAPI
├── backend/
│   ├── app/main.py           # REST routes
│   ├── app/store/            # local JSON + Firestore
│   ├── app/services/         # LLM, streak_pot, spending, heuristics
│   └── tests/                # pytest integration tests
├── client/src/
│   ├── pages/                # Home, Dashboard, Activity, Social, Wealth, Goals
│   ├── components/           # dashboard/, activity/, social/, wealth/, SquirryNudgeBubble
│   └── lib/
│       ├── api/              # REST client + React Query shim
│       ├── contextEngine.ts  # Weather + exam → Safe to Spend
│       ├── receiptOcr.ts     # Tesseract wrapper
│       └── budgetCycle.ts    # Safe to spend math
├── shared/
│   ├── parseBankText.ts      # On-device transaction parser
│   ├── contextRules.ts       # Exam periods, campus coords
│   └── coachNudges.ts        # Squirry bubble copy logic
├── vercel.json
└── dist/public/              # Production build output
```

---

## Development

```bash
npm run dev          # FastAPI :8000 + Vite :3000
npm run check        # TypeScript
npm run test         # Vitest (shared + legacy routers)
npm run test:api     # pytest (11 integration tests)
npm run test:all     # Both
npm run build        # Production client → dist/public
npm start            # Serve API + static dist
```

Demo requests send `X-Demo-Mode: true` and use `DEMO_USER_ID` — no Firebase Auth required.

---

## Demo flow (judges — ~5 min)

1. **Home** → **Continue without login**
2. **Onboarding** — income + wallet split (or skip if profile exists)
3. **Dashboard** — **Safe to Spend Today**, donuts, open **Squirry nudge** (context + budget tip); dismiss with ×, tap squirrel to reopen
4. **Activity → Smart Scan** — paste sample text below or scan a receipt photo
5. **Activity → Manual log** — amount + category
6. **Wealth → Budget** — tap “Plan my budget for today”
7. **Social → Streak Pot** — **Stake 50 XP**, **Check today**, **Settle week**
8. **Social → League** — streak ranking (not wallet size)
9. **Goals** — view or create a savings goal

**Sample Smart Scan paste:**

```
TNG*SHP MYR 15.50
GRAB FOOD 23.80
MBB PETRON 45.00
```

---

## Deployment

### Vercel (`SquirrelSave/vercel.json`)



### Full stack (Railway / Render / Fly.io)

```bash
npm run build
npm start
```

Use Firestore in production for multi-user persistence beyond local JSON.

---

## Known limitations 

| Area | Status |
|------|--------|
| Real money / escrow | **Not implemented** — Streak Pot uses **XP only** |
| Grab surge API | **Simulated** from rain + heuristics, not live Grab pricing |
| Campus league | **Demo data** for showcase |
| Invest “Explore” | Toast placeholder, not live deep links |
| Auth | Demo guest only; Firebase Auth optional for production |
| **Vercel data** | **Ephemeral** — API uses `/tmp`; refresh or cold start may reset to bundled `backend/data/store.json` seed. Custom onboarding on Vercel may not persist. Use **localhost** for full demo or **Firestore** for production. |
| Exam calendar | Hard-coded demo periods in `shared/contextRules.ts` |

---

## Submission readiness

| Check | Status |
|-------|--------|
| `npm run check` | Pass |
| `npm run build` | Pass |
| `npm run test` + `npm run test:api` | 26 + 11 tests pass |
| Judge path (no login) | Works |
| README matches codebase | Yes |
| Slide stack aligned (React + FastAPI, not Flutter/Firebase-only) | Your slides should say this |


---

## License

MIT — see [package.json](./package.json).

**SquirryCoach** — finance that feels like texting a friend, not doing accounting.
