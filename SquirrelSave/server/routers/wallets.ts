import { z } from "zod";
import { walletTypeSchema } from "@shared/schemas";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createWallets,
  deleteUserWallets,
  getUserWallets,
  updateWallet,
} from "../db";

export const walletsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getUserWallets(ctx.user.id)),

  setup: protectedProcedure
    .input(
      z.object({
        monthlyIncome: z.number().positive(),
        allocations: z.array(
          z.object({
            walletType: walletTypeSchema,
            label: z.string(),
            allocationPercent: z.number().min(0).max(100),
            color: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await deleteUserWallets(ctx.user.id);
      const savingTypes = new Set(["savings", "emergency", "goals"]);
      const walletsToCreate = input.allocations.map((a) => {
        const amt = (a.allocationPercent / 100) * input.monthlyIncome;
        return {
          userId: ctx.user.id,
          walletType: a.walletType,
          label: a.label,
          allocationPercent: a.allocationPercent,
          allocatedAmount: amt,
          currentBalance: savingTypes.has(a.walletType) ? 0 : amt,
          color: a.color,
        };
      });
      await createWallets(walletsToCreate);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({ walletId: z.number(), currentBalance: z.number() }))
    .mutation(async ({ input }) => {
      await updateWallet(input.walletId, { currentBalance: input.currentBalance });
      return { success: true };
    }),
});
