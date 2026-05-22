import { DEV_OPEN_ID } from "@shared/const";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

/** Single shared user for hackathon mode (no login). */
export async function resolveGuestUser(): Promise<User> {
  await db.upsertUser({
    openId: DEV_OPEN_ID,
    name: "Guest",
    email: "guest@localhost",
    loginMethod: "guest",
    lastSignedIn: new Date(),
  });

  const user = await db.getUserByOpenId(DEV_OPEN_ID);
  if (!user) {
    throw new Error("[Guest] Failed to resolve default user — check DATABASE_URL");
  }
  return user;
}
