/** Client-safe type export — no runtime server imports in the browser bundle. */
import type { appRouter } from "./routers/index";

export type AppRouter = typeof appRouter;
