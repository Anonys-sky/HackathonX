import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useTransactionCacheInvalidation } from "@/hooks/useTransactionCache";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { ACTIVITY_CATEGORIES } from "./constants";
import type { TransactionCategory } from "./transactionCategories";

const EXAMPLES = [
  "TNG*SHP MYR 15.50\nGRAB FOOD 23.80\nMBB PETRON 45.00",
  "Starbucks RM 18.90\nTOLL SMART 3.50\nNetflix MYR 54.90",
];

type ParsedTx = {
  merchantName: string;
  category: string;
  amount: number;
  type: string;
  confidenceScore?: number;
  needsVerification?: boolean;
  note?: string;
};

export function AIParserTab({
  t,
}: {
  wallets: unknown[];
  t: (key: string) => string;
}) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedTx[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const invalidateTx = useTransactionCacheInvalidation();

  const parseMutation = trpc.transactions.parseRaw.useMutation({
    onSuccess: (data) => {
      setParsed(data.transactions as ParsedTx[]);
      setSelected(new Set(data.transactions.map((_: unknown, i: number) => i)));
      const needsReview = data.transactions.some(
        (tx: { needsVerification?: boolean }) => tx.needsVerification
      );
      toast.success(
        `${data.transactions.length} ${t("activity.parsed_count")} ${needsReview ? "🐿️" : "🤖"}`
      );
    },
    onError: () => {
      if (!rawText.trim()) return;
      toast.error(t("activity.parser_try_again"));
    },
  });

  const addMutation = trpc.transactions.add.useMutation({
    onSuccess: invalidateTx,
  });

  async function handleSaveSelected() {
    const toSave = parsed.filter((_, i) => selected.has(i));
    let saved = 0;
    for (const tx of toSave) {
      try {
        await addMutation.mutateAsync({
          merchantName: tx.merchantName,
          category: tx.category as TransactionCategory,
          amount: tx.amount,
          type: tx.type as "expense" | "income",
          rawText,
          confidenceScore: tx.confidenceScore,
          needsVerification: tx.needsVerification,
          note: tx.note,
        });
        saved++;
      } catch {
        /* continue batch */
      }
    }
    toast.success(`${t("common.success")} +${saved * 10} XP 🐿️`);
    setParsed([]);
    setRawText("");
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-[oklch(0.95_0.05_295)] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-[oklch(0.5_0.2_295)]" />
          <p className="text-sm font-bold text-[oklch(0.3_0.15_295)]">{t("activity.parser_title")}</p>
        </div>
        <p className="text-xs text-[oklch(0.4_0.1_295)]">{t("activity.parser_desc")}</p>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-2 block">{t("activity.paste_text")}</Label>
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"TNG*SHP MYR 15.50\nGRAB FOOD 23.80\nMBB PETRON 45.00"}
          className="rounded-2xl min-h-[120px] text-sm font-mono resize-none"
        />
        <div className="flex gap-2 mt-2">
          <p className="text-xs text-muted-foreground">{t("activity.try_example")}:</p>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setRawText(ex)}
              className="text-xs text-primary font-semibold underline"
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => parseMutation.mutate({ rawText })}
        disabled={!rawText.trim() || parseMutation.isPending}
        className="w-full rounded-2xl h-12 font-semibold bg-[oklch(0.62_0.2_295)] text-white"
      >
        {parseMutation.isPending ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" /> {t("activity.parsing")}
          </>
        ) : (
          <>
            <Sparkles size={16} className="mr-2" /> {t("activity.parse_btn")}
          </>
        )}
      </Button>

      <AnimatePresence>
        {parsed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                {parsed.length} {t("activity.parsed_count")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(new Set(parsed.map((_, i) => i)))}
                  className="text-xs text-primary font-semibold"
                >
                  {t("activity.select_all")}
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-muted-foreground font-semibold"
                >
                  {t("activity.deselect_all")}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {parsed.map((tx, i) => {
                const cat = ACTIVITY_CATEGORIES.find((c) => c.value === tx.category);
                const isSelected = selected.has(i);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-xl p-3 border border-border cursor-pointer transition-all"
                    onClick={() => {
                      const newSet = new Set(selected);
                      if (isSelected) newSet.delete(i);
                      else newSet.add(i);
                      setSelected(newSet);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{tx.merchantName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {cat ? t(cat.labelKey) : tx.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tx.confidenceScore}% {t("activity.confidence")}
                          </span>
                          {tx.needsVerification && <AlertCircle size={12} className="text-yellow-500" />}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground">RM{tx.amount.toFixed(2)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Button
              onClick={handleSaveSelected}
              disabled={selected.size === 0 || addMutation.isPending}
              className="w-full rounded-2xl h-12 font-semibold bg-coral-gradient text-white"
            >
              {addMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {t("activity.save_btn")} ({selected.size})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
