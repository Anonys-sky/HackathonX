import "dotenv/config";
import { bootstrapMemoryMysql } from "../server/_core/bootstrapMysql.ts";

await bootstrapMemoryMysql();
console.log("Database ready:", process.env.DATABASE_URL);
