import { trpc } from "@/lib/trpc";

/** Hackathon mode: no login — always uses the server guest user. */
export function useAuth() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error ?? null,
    isAuthenticated: true,
    refresh: () => meQuery.refetch(),
    logout: async () => {},
  };
}
