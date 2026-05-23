# SquirryCoach — local setup

## Start the app

```powershell
cd c:\Users\User\HackathonX\SquirrelSave
pip install -r backend/requirements.txt
npm install --legacy-peer-deps
npm run dev
```

Open **http://localhost:3000** (Vite). API runs at **http://127.0.0.1:8000**; Vite proxies `/api` to it.

On **Home**, tap **Continue without login** to enter as the demo guest (no account).

## What was configured

| Item | How |
|------|-----|
| **API** | Python FastAPI (`backend/`) |
| **Data** | Local JSON file by default (`backend/data/store.json`) — no MySQL required |
| **LLM** | OpenAI `gpt-4o-mini` via `.env` + **offline fallback** if quota fails |
| **Auth** | Demo guest (`DEMO_USER_ID`) — no sign-in for judges |
| **Secrets** | `.env` only (gitignored) |

## Optional: Firebase Firestore

```env
DATA_BACKEND=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

## Optional: legacy Node + MySQL

```powershell
npm run dev:legacy
```

Requires `AUTO_START_MYSQL=true` or Docker MySQL — see `.env.example`.

## AI / LLM

- **`LLM_FALLBACK_ENABLED=true`** (default): coach chat and transaction parser work when OpenAI returns 429 quota errors.
- **Full AI again**: Add billing at [platform.openai.com](https://platform.openai.com), or use **Groq** (free tier):

```env
LLM_API_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_your-groq-key
LLM_MODEL=llama-3.1-8b-instant
```

## Production

```powershell
npm run build
npm start
```

Serves the SPA and API on port **8000**.

For split hosting (e.g. Vercel frontend + Railway API), set `VITE_API_URL=https://your-api.example.com` before `npm run build`.

## Troubleshooting

- **Port in use**: Stop other terminals using 3000 or 8000.  
- **`python` not found**: Install Python 3.10+ and re-run `pip install -r backend/requirements.txt`.  
- **Coach 500 / quota**: Set `LLM_FALLBACK_ENABLED=true` in `.env` and restart `npm run dev`.  
- **Empty profile after demo**: Complete onboarding once, or call `POST /api/auth/demo` from the Home button.
