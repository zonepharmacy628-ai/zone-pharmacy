import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { seedDatabase } from "./seed";

export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __medizoneDb?: Promise<DB> };

/**
 * Postgres when DATABASE_URL is set (production / Vercel). Without it, an
 * embedded PGlite database under .data/ is created, migrated and seeded so the
 * project runs locally with zero setup.
 */
async function init(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
    return drizzle(pool, { schema });
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add a Postgres connection string in the Vercel project settings.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const fs = await import("node:fs");
  const dir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(path.join(dir, "pglite"));
  const local = drizzle(client, { schema });
  await migrate(local, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const db = local as unknown as DB;
  await seedDatabase(db);
  return db;
}

export function getDb(): Promise<DB> {
  if (!globalForDb.__medizoneDb) {
    globalForDb.__medizoneDb = init().catch((err) => {
      globalForDb.__medizoneDb = undefined;
      throw err;
    });
  }
  return globalForDb.__medizoneDb;
}

export { schema };
