import { dateKey } from "@shared/budgetPlanner";

export type GroupableTx = {
  id: number;
  merchantName: string;
  amount: number;
  type: string;
  category: string;
  transactedAt?: string;
  needsVerification?: boolean;
};

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function formatSectionDate(key: string, locale: string) {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

export function groupTransactionsByDate(
  txs: GroupableTx[],
  labels: { today: string; yesterday: string },
  locale = "en-MY"
) {
  const todayKey = dateKey(new Date());
  const yesterdayKey = dateKey(addDays(new Date(), -1));

  const map = new Map<string, GroupableTx[]>();
  for (const tx of txs) {
    const key = tx.transactedAt ? dateKey(new Date(tx.transactedAt)) : todayKey;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({
      key,
      label:
        key === todayKey
          ? labels.today
          : key === yesterdayKey
            ? labels.yesterday
            : formatSectionDate(key, locale),
      items: items.sort((a: GroupableTx, b: GroupableTx) => {
        const ta = a.transactedAt ? new Date(a.transactedAt).getTime() : 0;
        const tb = b.transactedAt ? new Date(b.transactedAt).getTime() : 0;
        return tb - ta;
      }),
    }));
}
