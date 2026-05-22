import { CATEGORY_META } from "@shared/config";

export const ACTIVITY_CATEGORIES = CATEGORY_META;

export const CATEGORY_COLORS = Object.fromEntries(
  CATEGORY_META.map((c) => [c.value, c.colorClass])
);
