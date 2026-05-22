/** Safe env reads for code shared by Node (server) and Vite (browser). */

export function envString(key: string, fallback: string): string {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key] as string;
  }
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const vite = import.meta.env as Record<string, string | undefined>;
    if (vite[key]) return vite[key] as string;
  }
  return fallback;
}

export function envNumber(key: string, fallback: number): number {
  const raw = envString(key, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
