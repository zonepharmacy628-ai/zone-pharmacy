import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { settings } from "./db/schema";
import { DEFAULT_SETTINGS, type SiteSettings } from "./settings-shared";

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, "site"));
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<SiteSettings>) ?? {}) };
});

export async function saveSettings(patch: Partial<SiteSettings>) {
  const db = await getDb();
  const current = await getSettings();
  const value = { ...current, ...patch };
  await db.insert(settings).values({ key: "site", value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  return value;
}
