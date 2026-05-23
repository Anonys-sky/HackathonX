import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { parseBankText } from "@shared/parseBankText";
import { useTransactionCacheInvalidation } from "@/hooks/useTransactionCache";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Zap, AlertCircle, Loader2, Camera, FileText, ImagePlus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractTextFromImage } from "@/lib/receiptOcr";
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

type ScanMode = "paste" | "ocr";

export function SmartScanTab({ t }: { t: (key: string) => string }) {
  const [mode, setMode] = useState<ScanMode>("ocr");
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedTx[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invalidateTx = useTransactionCacheInvalidation();

  const [isParsing, setIsParsing] = useState(false);

  const addMutation = trpc.transactions.add.useMutation({
    onSuccess: invalidateTx,
  });

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleImagePicked(file: File | undefined) {
    if (!file) return;
    clearPreview();
    setPreviewUrl(URL.createObjectURL(file));
    setIsOcrRunning(true);
    setOcrProgress(0);
    try {
      const text = await extractTextFromImage(file, setOcrProgress);
      if (!text) {
        toast.error(t("activity.ocr_no_text"));
        return;
      }
      setRawText(text);
      toast.success(t("activity.ocr_done"));
    } catch {
      toast.error(t("activity.ocr_failed"));
    } finally {
      setIsOcrRunning(false);
      setOcrProgress(0);
    }
  }

  function handleParseLocal() {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const { transactions } = parseBankText(rawText);
      if (!transactions.length) {
        toast.error(t("activity.parser_try_again"));
        return;
      }
      setParsed(transactions as ParsedTx[]);
      setSelected(new Set(transactions.map((_, i) => i)));
      toast.success(`${transactions.length} ${t("activity.parsed_count")}`);
    } catch {
      toast.error(t("activity.parser_try_again"));
    } finally {
      setIsParsing(false);
    }
  }

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
    toast.success(`${t("common.success")} (+${saved * 10} XP)`);
    setParsed([]);
    setRawText("");
    clearPreview();
  }

  const busy = isParsing || isOcrRunning;

  return (
    <div className="space-y-4 pb-8">
      <div className="bg-[oklch(0.97_0.04_55)] rounded-2xl p-4 border border-amber-200/60">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={18} className="text-[oklch(0.62_0.18_45)]" />
          <p className="text-sm font-bold text-foreground">{t("activity.smart_scan_title")}</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{t("activity.smart_scan_desc")}</p>
        <p className="text-[10px] font-semibold text-[oklch(0.4_0.12_160)] mt-2 flex items-center gap-1">
          <Shield size={12} />
          {t("activity.zero_trust_badge")}
        </p>
      </div>

      <div className="flex rounded-2xl bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode("ocr")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            mode === "ocr" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          <Camera size={16} />
          {t("activity.scan_photo")}
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            mode === "paste" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          <FileText size={16} />
          {t("activity.scan_paste")}
        </button>
      </div>

      {mode === "ocr" ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              void handleImagePicked(file);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={isOcrRunning}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full rounded-2xl border-2 border-dashed border-primary/40 bg-white p-6",
              "flex flex-col items-center gap-2 active:bg-muted/40 transition-colors"
            )}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="max-h-40 rounded-xl object-contain w-full"
              />
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImagePlus size={28} className="text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground">{t("activity.ocr_pick")}</p>
                <p className="text-xs text-muted-foreground text-center">{t("activity.ocr_pick_hint")}</p>
              </>
            )}
          </button>

          {isOcrRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("activity.ocr_reading")}</span>
                <span>{ocrProgress}%</span>
              </div>
              <Progress value={ocrProgress} className="h-2" />
            </div>
          )}

          {previewUrl && !isOcrRunning && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                clearPreview();
                fileInputRef.current?.click();
              }}
            >
              {t("activity.ocr_retake")}
            </Button>
          )}
        </div>
      ) : null}

      <div>
        <Label className="text-sm font-semibold mb-2 block">
          {mode === "ocr" ? t("activity.ocr_extracted_label") : t("activity.paste_text")}
        </Label>
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={t("activity.ocr_placeholder")}
          className="rounded-2xl min-h-[120px] text-sm font-mono resize-none bg-white"
        />
        {mode === "paste" && (
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <span className="text-xs text-muted-foreground">{t("activity.try_example")}:</span>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRawText(ex)}
                className="text-xs text-primary font-semibold underline"
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={handleParseLocal}
        disabled={!rawText.trim() || busy}
        className="w-full rounded-2xl h-12 font-semibold gap-2"
      >
        {isParsing ? (
          <>
            <Loader2 size={16} className="animate-spin" /> {t("activity.parsing")}
          </>
        ) : (
          <>
            <Zap size={16} /> {t("activity.scan_btn")}
          </>
        )}
      </Button>

      <AnimatePresence>
        {parsed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{parsed.length} {t("activity.parsed_count")}</p>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(parsed.map((_, i) => i)))}
                  className="text-primary font-semibold"
                >
                  {t("activity.select_all")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-muted-foreground font-semibold"
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
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const next = new Set(selected);
                      if (isSelected) next.delete(i);
                      else next.add(i);
                      setSelected(next);
                    }}
                    className={cn(
                      "w-full bg-white rounded-xl p-3 border text-left transition-colors",
                      isSelected ? "border-primary ring-1 ring-primary/30" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center text-[10px]",
                          isSelected ? "bg-primary border-primary text-white" : "border-border"
                        )}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-base shrink-0">
                        {cat?.emoji ?? "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{tx.merchantName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {cat ? t(cat.labelKey) : tx.category}
                          {tx.needsVerification && (
                            <AlertCircle size={10} className="inline ml-1 text-amber-500" />
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">RM{tx.amount.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={handleSaveSelected}
              disabled={selected.size === 0 || addMutation.isPending}
              className="w-full rounded-2xl h-12 font-bold"
            >
              {addMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {t("activity.save")} ({selected.size})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
