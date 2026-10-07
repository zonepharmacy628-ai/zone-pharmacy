"use server";

import { inArray, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DENIED, getOwner } from "@/lib/auth";
import type { ActionResult } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { deleteFile, formObject, hasUpload, invalid, logActivity, saveUpload } from "@/lib/server-utils";
import { getSettings, saveSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/settings-shared";
import { checkbox, moneySchema, optionalEmail, optionalPhone, optionalText, text } from "@/lib/validators";

const time = z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time");

const schemas = {
  branding: z.object({
    pharmacyName: text("Pharmacy name", 2, 60),
    websiteTitle: text("Website title", 2, 120),
    tagline: optionalText(80),
  }),
  homepage: z.object({
    announcement: optionalText(120),
    heroBadge: optionalText(60),
    heroHeading: text("Heading", 2, 80),
    heroHighlight: optionalText(60),
    heroDescription: optionalText(240),
  }),
  delivery: z.object({
    deliveryCharge: moneySchema("Delivery charge"),
    freeDeliveryThreshold: moneySchema("Free delivery threshold"),
    deliveryTime: text("Delivery time", 2, 60),
    deliveryMessage: text("Delivery message", 2, 200),
  }),
  payment: z.object({
    codEnabled: checkbox,
    jazzcashEnabled: checkbox,
    jazzcashTitle: optionalText(80),
    jazzcashNumber: optionalText(30),
    bankEnabled: checkbox,
    bankName: optionalText(80),
    bankAccountTitle: optionalText(80),
    bankAccountNumber: optionalText(40),
    bankIban: optionalText(40),
  }),
  store: z.object({
    storeAddress: optionalText(240),
    storePhone: optionalPhone,
    storeEmail: optionalEmail,
    openingTime: time,
    closingTime: time,
    currency: text("Currency", 1, 6),
  }),
};

export type SettingsSection = keyof typeof schemas;

const ids = (fd: FormData, name: string) =>
  [...new Set(fd.getAll(name).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);

/** Website Editor — Owner only, enforced here on the server regardless of what the UI shows. */
export async function saveSettingsAction(section: SettingsSection, fd: FormData): Promise<ActionResult> {
  const owner = await getOwner();
  if (!owner) return DENIED;
  const schema = schemas[section];
  if (!schema) return { ok: false, message: "Unknown settings section." };
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const patch: Partial<SiteSettings> = { ...parsed.data };
  const current = await getSettings();

  if (section === "payment") {
    const p = patch as z.infer<typeof schemas.payment>;
    if (!p.codEnabled && !p.jazzcashEnabled && !p.bankEnabled) {
      return { ok: false, message: "Keep at least one payment method enabled." };
    }
    if (p.jazzcashEnabled && (!p.jazzcashTitle || !p.jazzcashNumber)) {
      return { ok: false, message: "Enter the JazzCash account title and number before enabling it.", errors: { jazzcashNumber: "Required when JazzCash is enabled" } };
    }
    if (p.bankEnabled && (!p.bankName || !p.bankAccountTitle || (!p.bankAccountNumber && !p.bankIban))) {
      return { ok: false, message: "Enter the bank name, account title and account number or IBAN before enabling Bank Transfer.", errors: { bankName: "Bank details are required" } };
    }
  }

  const uploads: [field: string, key: "logoFileId" | "faviconFileId" | "heroImageFileId"][] =
    section === "branding"
      ? [
          ["logo", "logoFileId"],
          ["favicon", "faviconFileId"],
        ]
      : section === "homepage"
        ? [["heroImage", "heroImageFileId"]]
        : [];
  const stale: (string | null)[] = [];
  for (const [field, key] of uploads) {
    const file = fd.get(field);
    if (hasUpload(file)) {
      const saved = await saveUpload(file, "branding", owner.id);
      if ("error" in saved) return { ok: false, message: saved.error, errors: { [field]: saved.error } };
      patch[key] = saved.id;
      stale.push(current[key]);
    } else if (fd.get(`${field}Remove`) === "on") {
      patch[key] = null;
      stale.push(current[key]);
    }
  }

  if (section === "homepage") {
    patch.popularCategoryIds = ids(fd, "popularCategoryIds");
    const featured = ids(fd, "featuredProductIds");
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({ featured: false })
        .where(featured.length ? notInArray(products.id, featured) : sql`true`);
      if (featured.length) await tx.update(products).set({ featured: true }).where(inArray(products.id, featured));
    });
  }

  await saveSettings(patch);
  for (const id of stale) await deleteFile(id);
  await logActivity(owner, "Website settings changed", `${section[0].toUpperCase()}${section.slice(1)} settings`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}
