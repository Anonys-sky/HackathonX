import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

type MemoryDb = {
  port: number;
  dbName: string;
  username: string;
  stop: () => Promise<void>;
};

declare global {
  // eslint-disable-next-line no-var
  var __piggyMysqlMemory: MemoryDb | undefined;
}

async function applyMigrations(url: string) {
  const conn = await mysql.createConnection(url);
  const drizzleDir = path.resolve(import.meta.dirname, "../../drizzle");
  const files = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(drizzleDir, file), "utf8");
    const statements = raw
      .split(/-->\s*statement-breakpoint/g)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already exists")) continue;
        throw err;
      }
    }
  }
  await conn.end();
}

export async function bootstrapMemoryMysql(): Promise<void> {
  if (process.env.AUTO_START_MYSQL !== "true") return;
  if (globalThis.__piggyMysqlMemory) return;

  console.log("[MySQL] Starting embedded MySQL (first run may download binaries)...");
  const { createDB } = await import("mysql-memory-server");

  const db = await createDB({
    version: "8.4.x",
    dbName: "piggy_coach",
    username: "root",
    port: 0,
    logLevel: "WARN",
  });

  const url = `mysql://root@127.0.0.1:${db.port}/${db.dbName}`;
  process.env.DATABASE_URL = url;
  globalThis.__piggyMysqlMemory = db;

  console.log(`[MySQL] Running at ${url}`);
  await applyMigrations(url);
  console.log("[MySQL] Migrations applied");
}
