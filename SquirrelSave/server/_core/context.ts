import { TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { resolveGuestUser } from "./guestUser";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User;
  try {
    user = await resolveGuestUser();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to resolve guest user";
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
