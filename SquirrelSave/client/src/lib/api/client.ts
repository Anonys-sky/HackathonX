import type {
  ApiAuthUser,
  ApiBudgetAlert,
  ApiGoal,
  ApiPlanBudgetResult,
  ApiProfile,
  ApiStats,
  ApiStreak,
  ApiTransaction,
  ApiWallet,
  ApiXpEvent,
  ApiXpMutation,
  ApiStreakPot,
  ApiStreakPotCheckIn,
} from "./types";

const configuredBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** Bases to try: env URL → same-origin (Vite proxy / Vercel rewrite) → local API in dev */
function apiBases(): string[] {
  const bases: string[] = [];
  if (configuredBase) bases.push(configuredBase);
  bases.push("");
  if (import.meta.env.DEV && configuredBase !== "http://127.0.0.1:8000") {
    bases.push("http://127.0.0.1:8000");
  }
  return bases;
}

function isHtmlBody(text: string): boolean {
  const t = text.trimStart().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  const preview = text.slice(0, 80).replace(/\s+/g, " ");

  if (!contentType.includes("application/json") && isHtmlBody(text)) {
    throw new Error("__HTML_RESPONSE__");
  }
  if (!contentType.includes("application/json") && text.length > 0) {
    throw new Error(preview || "Invalid API response");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from API: ${preview}`);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const bases = apiBases();
  let lastError: Error | null = null;

  for (let i = 0; i < bases.length; i++) {
    const base = bases[i]!;
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Demo-Mode": "true",
          ...(options.headers as Record<string, string>),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const j = JSON.parse(text);
          message = j.detail ?? j.message ?? text;
        } catch {
          /* raw text */
        }
        throw new Error(typeof message === "string" ? message : JSON.stringify(message));
      }

      if (res.status === 204) return undefined as T;
      return await parseJsonResponse<T>(res);
    } catch (err) {
      const isHtml =
        err instanceof Error &&
        (err.message === "__HTML_RESPONSE__" || isHtmlBody(err.message));
      const canRetry = isHtml && i < bases.length - 1;
      if (canRetry) {
        lastError = err;
        continue;
      }
      if (isHtml) {
        throw new Error(
          "API returned HTML instead of JSON. Run `npm run dev` from SquirrelSave (starts API + web). " +
            "After deploying to Vercel, redeploy so the Python /api function is included."
        );
      }
      throw err;
    }
  }

  throw lastError ?? new Error("API request failed");
}

export const apiClient = {
  auth: {
    me: () => request<ApiAuthUser | null>("/api/auth/me"),
    demo: () => request<{ user: ApiAuthUser }>("/api/auth/demo", { method: "POST" }),
  },
  profile: {
    get: () => request<ApiProfile | null>("/api/profile"),
    setup: (body: { monthlyIncome: number; currency: string }) =>
      request("/api/profile/setup", { method: "POST", body: JSON.stringify(body) }),
    completeOnboarding: () =>
      request("/api/profile/complete-onboarding", { method: "POST" }),
    getStats: () => request<ApiStats>("/api/profile/stats"),
  },
  wallets: {
    list: () => request<ApiWallet[]>("/api/wallets"),
    setup: (body: unknown) =>
      request("/api/wallets/setup", { method: "POST", body: JSON.stringify(body) }),
    update: (walletId: number, currentBalance: number) =>
      request(`/api/wallets/${walletId}?currentBalance=${currentBalance}`, {
        method: "PATCH",
      }),
  },
  transactions: {
    list: (params: {
      limit?: number;
      offset?: number;
      fromDate?: string;
      toDate?: string;
    }) => {
      const q = new URLSearchParams();
      if (params.limit != null) q.set("limit", String(params.limit));
      if (params.offset != null) q.set("offset", String(params.offset));
      if (params.fromDate) q.set("fromDate", params.fromDate);
      if (params.toDate) q.set("toDate", params.toDate);
      return request<{ transactions: ApiTransaction[]; total: number }>(
        `/api/transactions?${q}`
      );
    },
    add: (body: unknown) =>
      request("/api/transactions", { method: "POST", body: JSON.stringify(body) }),
    update: (txId: number, body: unknown) =>
      request(`/api/transactions/${txId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (txId: number) =>
      request(`/api/transactions/${txId}`, { method: "DELETE" }),
    budgetAlerts: () => request<ApiBudgetAlert[]>("/api/transactions/budget-alerts"),
    parseRaw: (body: { rawText: string }) =>
      request<{ transactions: ApiTransaction[] }>("/api/transactions/parse-raw", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  goals: {
    list: (params?: { limit?: number }) => {
      const q = params?.limit != null ? `?limit=${params.limit}` : "";
      return request<ApiGoal[]>(`/api/goals${q}`);
    },
    create: (body: unknown) =>
      request("/api/goals", { method: "POST", body: JSON.stringify(body) }),
    update: (goalId: number, body: unknown) =>
      request(`/api/goals/${goalId}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (goalId: number) =>
      request(`/api/goals/${goalId}`, { method: "DELETE" }),
    addFunds: (goalId: number, amount: number) =>
      request<ApiXpMutation>(`/api/goals/${goalId}/add-funds?amount=${amount}`, { method: "POST" }),
  },
  streakPots: {
    list: () => request<ApiStreakPot[]>("/api/streak-pots"),
    create: (body: { stakeXp: number }) =>
      request<ApiStreakPot>("/api/streak-pots", { method: "POST", body: JSON.stringify(body) }),
    checkIn: (potId: number) =>
      request<ApiStreakPotCheckIn>(`/api/streak-pots/${potId}/check-in`, { method: "POST" }),
    settle: (potId: number) =>
      request<ApiStreakPot>(`/api/streak-pots/${potId}/settle`, { method: "POST" }),
  },
  streaks: {
    list: () => request<ApiStreak[]>("/api/streaks"),
    addFriend: (body: unknown) =>
      request("/api/streaks/friends", { method: "POST", body: JSON.stringify(body) }),
    incrementStreak: (streakId: number) =>
      request<ApiXpMutation>(`/api/streaks/${streakId}/increment`, { method: "POST" }),
  },
  gamification: {
    xpHistory: () => request<ApiXpEvent[]>("/api/gamification/xp-history"),
    logDailyAction: (body: { action: string }) =>
      request<ApiXpMutation>("/api/gamification/daily-action", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  coach: {
    history: () => request<unknown[]>("/api/coach/history"),
    chat: (body: { message: string }) =>
      request<{ reply: string; usedFallback?: boolean; providerError?: string | null }>(
        "/api/coach/chat",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),
    clearHistory: () => request("/api/coach/history", { method: "DELETE" }),
    planBudget: (body: unknown) =>
      request<ApiPlanBudgetResult>("/api/coach/plan-budget", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
