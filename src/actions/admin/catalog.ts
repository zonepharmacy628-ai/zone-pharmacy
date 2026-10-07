"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DENIED, getStaff } from "@/lib/auth";
import type { ActionResult } from "@/lib/constants";
import { getDb, type Tx } from "@/lib/db";
import { categories, products, stockMovements } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { deleteFile, formObject, hasUpload, invalid, logActivity, saveUpload } from "@/lib/server-utils";
import { slugify } from "@/lib/utils";
import { checkbox, intSchema, moneySchema, optionalDate, optionalId, optionalMoney, optionalText, text } from "@/lib/validators";

const productSchema = z.object({
  id: optionalId,
  name: text("Product name", 2, 120),
  genericName: optionalText(120),
  brand: optionalText(80),
  shortDescription: optionalText(160),
  description: optionalText(5000),
  categoryId: optionalId,
  price: moneySchema("Price"),
  comparePrice: optionalMoney,
  costPrice: moneySchema("Purchase cost"),
  stock: intSchema("Stock"),
  lowStockThreshold: intSchema("Low-stock threshold", 0, 100000),
  available: checkbox,
  requiresPrescription: checkbox,
  featured: checkbox,
  popular: checkbox,
  expiryDate: optionalDate,
  removeImage: checkbox,
});

async function uniqueSlug(tx: Tx, table: typeof products | typeof categories, name: string) {
  const base = slugify(name) || "item";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const [clash] = await tx
      .select({ id: table.id })
      .from(table)
      .where(eq(table.slug, slug));
    if (!clash) return slug;
  }
  return `${base}-${Date.now()}`;
}

export async function saveProductAction(fd: FormData): Promise<ActionResult<{ id: number }>> {
  const staff = await getStaff("manage_products");
  if (!staff) return DENIED;
  const parsed = productSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, removeImage, stock, ...data } = parsed.data;
  if (data.comparePrice !== null && data.comparePrice <= data.price) data.comparePrice = null;
  const image = fd.get("image");
  const db = await getDb();

  try {
    const savedId = await db.transaction(async (tx) => {
      if (data.categoryId) {
        const [cat] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, data.categoryId));
        if (!cat) throw new Error("Selected category no longer exists.");
      }
      let imageFileId: string | null | undefined;
      if (hasUpload(image)) {
        const saved = await saveUpload(image, "product", staff.id, tx);
        if ("error" in saved) throw new Error(saved.error);
        imageFileId = saved.id;
      } else if (removeImage) {
        imageFileId = null;
      }

      if (id) {
        const [current] = await tx.select().from(products).where(eq(products.id, id)).for("update");
        if (!current) throw new Error("Product not found.");
        // Stock can only be changed here by staff who are also allowed to manage stock.
        const newStock = can(staff, "manage_stock") ? stock : current.stock;
        await tx
          .update(products)
          // The URL slug is fixed at creation so renaming never breaks existing links.
          .set({ ...data, stock: newStock, ...(imageFileId !== undefined ? { imageFileId } : {}) })
          .where(eq(products.id, id));
        if (newStock !== current.stock) {
          await tx.insert(stockMovements).values({
            productId: id,
            change: newStock - current.stock,
            balanceAfter: newStock,
            reason: "adjustment",
            note: "Edited on product form",
            userId: staff.id,
          });
        }
        if (imageFileId !== undefined && current.imageFileId) await deleteFile(current.imageFileId, tx);
        await logActivity(staff, "Product updated", data.name, tx);
        return id;
      }

      const slug = await uniqueSlug(tx, products, data.name);
      const [row] = await tx
        .insert(products)
        .values({ ...data, slug, stock, imageFileId: imageFileId ?? null })
        .returning({ id: products.id });
      if (stock > 0) {
        await tx.insert(stockMovements).values({
          productId: row.id,
          change: stock,
          balanceAfter: stock,
          reason: "adjustment",
          note: "Opening stock",
          userId: staff.id,
        });
      }
      await logActivity(staff, "Product added", data.name, tx);
      return row.id;
    });
    revalidatePath("/", "layout");
    return { ok: true, message: id ? "Product updated." : "Product added.", data: { id: savedId } };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not save the product." };
  }
}

export async function deleteProductAction(id: number): Promise<ActionResult> {
  const staff = await getStaff("manage_products");
  if (!staff) return DENIED;
  const db = await getDb();
  const [removed] = await db
    .delete(products)
    .where(eq(products.id, Number(id)))
    .returning({ name: products.name, imageFileId: products.imageFileId });
  if (!removed) return { ok: false, message: "Product not found." };
  await deleteFile(removed.imageFileId);
  await logActivity(staff, "Product deleted", removed.name);
  revalidatePath("/", "layout");
  return { ok: true, message: "Product deleted." };
}

const categorySchema = z.object({
  id: optionalId,
  name: text("Category name", 2, 60),
  icon: optionalText(30),
  sortOrder: intSchema("Sort order", 0, 9999),
  active: checkbox,
});

export async function saveCategoryAction(fd: FormData): Promise<ActionResult> {
  const staff = await getStaff("manage_products");
  if (!staff) return DENIED;
  const parsed = categorySchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  const db = await getDb();
  const error = await db.transaction(async (tx) => {
    const [dupe] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(and(sql`lower(${categories.name}) = ${data.name.toLowerCase()}`, id ? ne(categories.id, id) : undefined));
    if (dupe) return "A category with this name already exists.";
    const values = { ...data, icon: data.icon || "pill" };
    if (id) {
      const [current] = await tx.select().from(categories).where(eq(categories.id, id));
      if (!current) return "Category not found.";
      await tx.update(categories).set(values).where(eq(categories.id, id));
    } else {
      await tx.insert(categories).values({ ...values, slug: await uniqueSlug(tx, categories, data.name) });
    }
    await logActivity(staff, id ? "Category updated" : "Category added", data.name, tx);
    return null;
  });
  if (error) return { ok: false, message: error, errors: { name: error } };
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Category updated." : "Category added." };
}

export async function toggleCategoryAction(id: number, active: boolean): Promise<ActionResult> {
  const staff = await getStaff("manage_products");
  if (!staff) return DENIED;
  const db = await getDb();
  const [row] = await db
    .update(categories)
    .set({ active: Boolean(active) })
    .where(eq(categories.id, Number(id)))
    .returning({ name: categories.name });
  if (!row) return { ok: false, message: "Category not found." };
  await logActivity(staff, active ? "Category enabled" : "Category disabled", row.name);
  revalidatePath("/", "layout");
  return { ok: true, message: active ? "Category enabled." : "Category disabled." };
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  const staff = await getStaff("manage_products");
  if (!staff) return DENIED;
  const db = await getDb();
  const [row] = await db.delete(categories).where(eq(categories.id, Number(id))).returning({ name: categories.name });
  if (!row) return { ok: false, message: "Category not found." };
  await logActivity(staff, "Category deleted", row.name);
  revalidatePath("/", "layout");
  return { ok: true, message: "Category deleted. Its products are now uncategorised." };
}
