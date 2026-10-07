/**
 * Applies pending migrations and seeds a Postgres database (production / Vercel).
 * Safe to run on every deploy: migrations are tracked and the seed is idempotent.
 *
 *   npm run db:setup
 *
 * Local development needs none of this — without DATABASE_URL the app creates
 * and seeds an embedded database in .data/ on first request.
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[db:setup] DATABASE_URL is not set — skipping (the embedded local database sets itself up automatically).");
    return;
  }
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const schema = await import("../src/lib/db/schema");
  const { seedDatabase } = await import("../src/lib/db/seed");

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const db = drizzle(pool, { schema });
    console.log("[db:setup] Applying migrations…");
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.log("[db:setup] Seeding…");
    await seedDatabase(db);
    console.log("[db:setup] Done.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[db:setup] Failed:", err);
  process.exit(1);
});
