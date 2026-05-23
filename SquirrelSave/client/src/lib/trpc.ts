import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/app-router-type";

export const trpc = createTRPCReact<AppRouter>();
