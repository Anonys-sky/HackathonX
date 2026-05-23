const STORAGE_KEY = "squirry_visitor_id";

/** Stable per-browser id so each visitor gets their own data on the server. */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `visitor-${crypto.randomUUID()}`
        : `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
