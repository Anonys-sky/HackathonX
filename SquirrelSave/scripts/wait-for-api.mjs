/** Wait for FastAPI on :8000 before starting Vite (avoids HTML proxy errors). */
const url = "http://127.0.0.1:8000/api/health";
const maxAttempts = 40;
const delayMs = 500;

for (let i = 0; i < maxAttempts; i++) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log("[dev] API ready at http://127.0.0.1:8000");
      process.exit(0);
    }
  } catch {
    /* retry */
  }
  await new Promise((r) => setTimeout(r, delayMs));
}

console.warn("[dev] API not responding on :8000 — start with: npm run dev:api");
process.exit(0);
