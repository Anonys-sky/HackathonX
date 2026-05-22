import { invokeLLM, type InvokeParams, type InvokeResult } from "../_core/llm";
import { ENV } from "../_core/env";
import {
  coachFallbackReply,
  isLlmFallbackEnabled,
  isRecoverableLlmError,
  jsonInvokeResult,
  parseTransactionsHeuristic,
  textInvokeResult,
  type CoachContext,
} from "./llmFallback";

export type AiInvokeMeta = {
  usedFallback: boolean;
  source: "api" | "local-fallback";
};

function noApiKey(): boolean {
  return !ENV.llmApiKey?.trim();
}

export async function invokeLLMSafe(
  params: InvokeParams,
  options?: {
    fallbackText?: string;
    fallbackJson?: unknown;
    coachContext?: CoachContext;
    userMessage?: string;
  }
): Promise<{ result: InvokeResult; meta: AiInvokeMeta }> {
  if (!isLlmFallbackEnabled() && noApiKey()) {
    throw new Error("LLM_API_KEY is not configured. Set it in .env or enable LLM_FALLBACK_ENABLED=true.");
  }

  if (isLlmFallbackEnabled() && noApiKey()) {
    return buildFallback(params, options);
  }

  try {
    const result = await invokeLLM(params);
    return { result, meta: { usedFallback: false, source: "api" } };
  } catch (err) {
    if (isLlmFallbackEnabled() && isRecoverableLlmError(err)) {
      console.warn("[LLM] API unavailable, using local fallback:", err instanceof Error ? err.message : err);
      return buildFallback(params, options);
    }
    throw err;
  }
}

function buildFallback(
  params: InvokeParams,
  options?: {
    fallbackText?: string;
    fallbackJson?: unknown;
    coachContext?: CoachContext;
    userMessage?: string;
  }
): { result: InvokeResult; meta: AiInvokeMeta } {
  if (options?.fallbackJson !== undefined) {
    return { result: jsonInvokeResult(options.fallbackJson), meta: { usedFallback: true, source: "local-fallback" } };
  }

  if (options?.coachContext && options?.userMessage) {
    const reply = coachFallbackReply(options.userMessage, options.coachContext);
    return { result: textInvokeResult(reply), meta: { usedFallback: true, source: "local-fallback" } };
  }

  if (options?.fallbackText) {
    return { result: textInvokeResult(options.fallbackText), meta: { usedFallback: true, source: "local-fallback" } };
  }

  const lastUser = [...params.messages].reverse().find((m) => m.role === "user");
  const userText =
    typeof lastUser?.content === "string"
      ? lastUser.content
      : "Parse these transactions:";

  if (userText.includes("Parse these transactions")) {
    const raw = userText.replace(/^Parse these transactions:\n?/i, "");
    return {
      result: jsonInvokeResult(parseTransactionsHeuristic(raw)),
      meta: { usedFallback: true, source: "local-fallback" },
    };
  }

  return {
    result: textInvokeResult(
      "I'm here in offline mode while the AI service is unavailable. Try again after adding API credits, or enable LLM_FALLBACK_ENABLED=true."
    ),
    meta: { usedFallback: true, source: "local-fallback" },
  };
}
