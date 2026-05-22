# SquirryCoach — local setup (done for you)

## Start the app

```powershell
cd c:\Users\User\HackathonX\SquirrelSave
npm run dev
```

First run may take a few minutes while embedded MySQL downloads (one time).

Open the URL printed in the terminal (usually **http://localhost:3000** or **3001** if 3000 is busy).

## No login required

The app uses a single **guest user** automatically (hackathon mode). Open the app and go straight to onboarding or the dashboard.

## What was configured

| Item | How |
|------|-----|
| **LLM** | OpenAI `gpt-4o-mini` via `.env` (auto **offline fallback** if quota fails) |
| **Database** | Embedded MySQL (`AUTO_START_MYSQL=true`) — no Docker required |
| **Auth** | None — shared guest user |
| **Secrets** | `.env` only (gitignored) |

## Optional: Docker MySQL instead

1. Install Docker Desktop  
2. Set `AUTO_START_MYSQL=false` in `.env`  
3. Run `docker compose up -d`  
4. Use `DATABASE_URL=mysql://piggy:piggy_pass@localhost:3306/piggy_coach`

## AI / LLM

- **`LLM_FALLBACK_ENABLED=true`** (default in dev): coach chat and transaction parser still work when OpenAI returns 429 quota errors.
- **Full AI again**: Add billing at [platform.openai.com](https://platform.openai.com), or use **Groq** (free tier):

```env
LLM_API_URL=https://api.groq.com/openai
LLM_API_KEY=gsk_your-groq-key
LLM_MODEL=llama-3.1-8b-instant
```

## Troubleshooting

- **Port in use**: Stop old terminals or use the port shown in logs.  
- **Stuck on first start**: Wait for `[MySQL] Migrations applied` and `Server running on...`  
- **Coach 500 / quota**: Restart `npm run dev` after setting `LLM_FALLBACK_ENABLED=true` in `.env`
