import type { Express, Request, Response } from "express";
import { COOKIE_NAME, DEV_OPEN_ID, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function isDevAuthEnabled(): boolean {
  return process.env.DEV_AUTH_ENABLED === "true" && !ENV.isProduction;
}

export function registerLocalAuthRoutes(app: Express) {
  if (!isDevAuthEnabled()) return;

  app.get("/api/auth/dev-login", async (req: Request, res: Response) => {
    try {
      if (!ENV.cookieSecret || ENV.cookieSecret.length < 16) {
        res.status(500).send("JWT_SECRET must be at least 16 characters");
        return;
      }

      const appId = ENV.appId || "squirry-coach-local";

      await db.upsertUser({
        openId: DEV_OPEN_ID,
        name: "Dev User",
        email: "dev@localhost",
        loginMethod: "local",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(DEV_OPEN_ID, {
        name: "Dev User",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[DevAuth] Login failed", error);
      res.status(500).send("Dev login failed. Check database connection and JWT_SECRET.");
    }
  });

  console.log("[DevAuth] Local login enabled at GET /api/auth/dev-login");
}
