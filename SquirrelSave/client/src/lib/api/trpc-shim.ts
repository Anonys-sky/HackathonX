/**
 * Drop-in replacement for tRPC hooks — calls FastAPI REST API.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "./client";
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

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

function useApiQuery<T>(
  key: unknown[],
  fetcher: () => Promise<T>,
  opts?: QueryOpts<T>
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: fetcher,
    ...opts,
  });
}

function useApiMutation<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  opts?: UseMutationOptions<TData, Error, TVariables>
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...opts,
  });
}

export const trpc = {
  useUtils: () => {
    const qc = useQueryClient();
    return {
      transactions: {
        list: { invalidate: () => qc.invalidateQueries({ queryKey: ["transactions", "list"] }) },
        budgetAlerts: {
          invalidate: () => qc.invalidateQueries({ queryKey: ["transactions", "budgetAlerts"] }),
        },
      },
      profile: {
        get: { invalidate: () => qc.invalidateQueries({ queryKey: ["profile", "get"] }) },
        getStats: { invalidate: () => qc.invalidateQueries({ queryKey: ["profile", "stats"] }) },
      },
      goals: { list: { invalidate: () => qc.invalidateQueries({ queryKey: ["goals"] }) } },
      streaks: { list: { invalidate: () => qc.invalidateQueries({ queryKey: ["streaks"] }) } },
      streakPots: { list: { invalidate: () => qc.invalidateQueries({ queryKey: ["streakPots"] }) } },
      gamification: {
        xpHistory: { invalidate: () => qc.invalidateQueries({ queryKey: ["gamification", "xp"] }) },
      },
    };
  },

  auth: {
    me: {
      useQuery: (_input?: void, opts?: QueryOpts<ApiAuthUser | null>) =>
        useApiQuery(["auth", "me"], () => apiClient.auth.me(), opts),
    },
  },

  profile: {
    get: {
      useQuery: (_input?: void, opts?: QueryOpts<ApiProfile | null>) =>
        useApiQuery(["profile", "get"], () => apiClient.profile.get(), opts),
    },
    setup: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, { monthlyIncome: number; currency: string }>) =>
        useApiMutation((v) => apiClient.profile.setup(v), opts),
    },
    completeOnboarding: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, void>) =>
        useApiMutation(() => apiClient.profile.completeOnboarding(), opts),
    },
    getStats: {
      useQuery: (_input?: void, opts?: QueryOpts<ApiStats>) =>
        useApiQuery(["profile", "stats"], () => apiClient.profile.getStats(), opts),
    },
  },

  wallets: {
    list: {
      useQuery: (_input?: void, opts?: QueryOpts<ApiWallet[]>) =>
        useApiQuery(["wallets"], () => apiClient.wallets.list(), opts),
    },
    setup: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, unknown>) =>
        useApiMutation((v) => apiClient.wallets.setup(v), opts),
    },
  },

  transactions: {
    list: {
      useQuery: (
        input?: { limit?: number; offset?: number; fromDate?: string; toDate?: string },
        opts?: QueryOpts<{ transactions: ApiTransaction[]; total: number }>
      ) =>
        useApiQuery(
          ["transactions", "list", input],
          () => apiClient.transactions.list(input ?? {}),
          opts
        ),
    },
    add: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, unknown>) =>
        useApiMutation((v) => apiClient.transactions.add(v), opts),
    },
    update: {
      useMutation: (
        opts?: UseMutationOptions<unknown, Error, { txId: number } & Record<string, unknown>>
      ) =>
        useApiMutation(({ txId, ...rest }) => apiClient.transactions.update(txId, rest), opts),
    },
    delete: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, { txId: number }>) =>
        useApiMutation(({ txId }) => apiClient.transactions.delete(txId), opts),
    },
    budgetAlerts: {
      useQuery: (_input?: void, opts?: QueryOpts<ApiBudgetAlert[]>) =>
        useApiQuery(["transactions", "budgetAlerts"], () => apiClient.transactions.budgetAlerts(), opts),
    },
    parseRaw: {
      useMutation: (opts?: UseMutationOptions<{ transactions: ApiTransaction[] }, Error, { rawText: string }>) =>
        useApiMutation((v) => apiClient.transactions.parseRaw(v), opts),
    },
  },

  goals: {
    list: {
      useQuery: (input?: { limit?: number }, opts?: QueryOpts<ApiGoal[]>) =>
        useApiQuery(["goals", input], () => apiClient.goals.list(input), opts),
    },
    create: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, unknown>) =>
        useApiMutation((v) => apiClient.goals.create(v), opts),
    },
    update: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, unknown>) =>
        useApiMutation((v: { goalId: number }) => {
          const { goalId, ...rest } = v as { goalId: number } & Record<string, unknown>;
          return apiClient.goals.update(goalId, rest);
        }, opts),
    },
    delete: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, { goalId: number }>) =>
        useApiMutation(({ goalId }) => apiClient.goals.delete(goalId), opts),
    },
    addFunds: {
      useMutation: (opts?: UseMutationOptions<ApiXpMutation, Error, { goalId: number; amount: number }>) =>
        useApiMutation(({ goalId, amount }) => apiClient.goals.addFunds(goalId, amount), opts),
    },
  },

  streakPots: {
    list: {
      useQuery: (_input?: void, opts?: QueryOpts<ApiStreakPot[]>) =>
        useApiQuery(["streakPots"], () => apiClient.streakPots.list(), opts),
    },
    create: {
      useMutation: (opts?: UseMutationOptions<ApiStreakPot, Error, { stakeXp: number }>) =>
        useApiMutation((v) => apiClient.streakPots.create(v), opts),
    },
    checkIn: {
      useMutation: (opts?: UseMutationOptions<ApiStreakPotCheckIn, Error, { potId: number }>) =>
        useApiMutation(({ potId }) => apiClient.streakPots.checkIn(potId), opts),
    },
    settle: {
      useMutation: (opts?: UseMutationOptions<ApiStreakPot, Error, { potId: number }>) =>
        useApiMutation(({ potId }) => apiClient.streakPots.settle(potId), opts),
    },
  },

  streaks: {
    list: {
      useQuery: (_input?: void, opts?: QueryOpts<ApiStreak[]>) =>
        useApiQuery(["streaks"], () => apiClient.streaks.list(), opts),
    },
    addFriend: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, unknown>) =>
        useApiMutation((v) => apiClient.streaks.addFriend(v), opts),
    },
    incrementStreak: {
      useMutation: (opts?: UseMutationOptions<ApiXpMutation, Error, { streakId: number }>) =>
        useApiMutation(({ streakId }) => apiClient.streaks.incrementStreak(streakId), opts),
    },
  },

  gamification: {
    xpHistory: {
      useQuery: (_input?: void, opts?: QueryOpts<ApiXpEvent[]>) =>
        useApiQuery(["gamification", "xp"], () => apiClient.gamification.xpHistory(), opts),
    },
    logDailyAction: {
      useMutation: (opts?: UseMutationOptions<ApiXpMutation, Error, { action: string }>) =>
        useApiMutation((v) => apiClient.gamification.logDailyAction(v), opts),
    },
  },

  coach: {
    history: {
      useQuery: (_input?: void, opts?: QueryOpts<unknown[]>) =>
        useApiQuery(["coach", "history"], () => apiClient.coach.history(), opts),
    },
    chat: {
      useMutation: (opts?: UseMutationOptions<{ reply: string }, Error, { message: string }>) =>
        useApiMutation((v) => apiClient.coach.chat(v), opts),
    },
    clearHistory: {
      useMutation: (opts?: UseMutationOptions<unknown, Error, void>) =>
        useApiMutation(() => apiClient.coach.clearHistory(), opts),
    },
    planBudget: {
      useMutation: (opts?: UseMutationOptions<ApiPlanBudgetResult, Error, unknown>) =>
        useApiMutation((v) => apiClient.coach.planBudget(v), opts),
    },
  },
};
