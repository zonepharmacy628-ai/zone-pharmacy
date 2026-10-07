"use server";

import { randomInt } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DENIED, getStaff } from "@/lib/auth";
import type { ActionResult } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { products, purchaseItems, purchases, stockMovements, suppliers } from "@/lib/db/schema";
import { formObject, invalid, logActivity } from "@/lib/server-utils";
import { round2, todayPk } from "@/lib/utils";
import { dateSchema, intSchema, moneySchema, optionalDate, optionalEmail, optionalId, optionalPhone, optionalText, requiredId, text } from "@/lib/validators";

const adjustSchema = z.object({
  productId: requiredId("product"),
  mode: z.enum(["add", "remove", "set"]),
  quantity: intSchema("Quantity", 0, 1_000_000),
  note: text("Reason", 3, 200),
});

export async function adjustStockAction(fd: FormData): Promise<ActionResult> {
  const staff = await getStaff("manage_stock");
  if (!staff) return DENIED;
  const parsed = adjustSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { productId, mode, quantity, note } = parsed.data;
  const db = await getDb();
  const error = await db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, productId)).for("update");
    if (!product) return "Product not found.";
    const next = mode === "set" ? quantity : mode === "add" ? product.stock + quantity : product.stock - quantity;
    if (next < 0) return `Cannot remove ${quantity}; only ${product.stock} in stock.`;
    if (next === product.stock) return "Stock is unchanged.";
    await tx.update(products).set({ stock: next }).where(eq(products.id, productId));
    await tx.insert(stockMovements).values({
      productId,
      change: next - product.stock,
      balanceAfter: next,
      reason: "adjustment",
      note,
      userId: staff.id,
    });
    await logActivity(staff, "Stock updated", `${product.name}: ${product.stock} → ${next} (${note})`, tx);
    return null;
  });
  if (error) return { ok: false, message: error, errors: { quantity: error } };
  revalidatePath("/", "layout");
  return { ok: true, message: "Stock updated." };
}

const supplierSchema = z.object({
  id: optionalId,
  name: text("Supplier name", 2, 100),
  company: optionalText(120),
  phone: optionalPhone,
  address: optionalText(300),
  email: optionalEmail,
});

export async function saveSupplierAction(fd: FormData): Promise<ActionResult> {
  const staff = await getStaff("manage_suppliers");
  if (!staff) return DENIED;
  const parsed = supplierSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  const db = await getDb();
  if (id) {
    const [row] = await db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
    if (!row) return { ok: false, message: "Supplier not found." };
  } else {
    await db.insert(suppliers).values(data);
  }
  await logActivity(staff, id ? "Supplier updated" : "Supplier added", data.name);
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Supplier updated." : "Supplier added." };
}

export async function deleteSupplierAction(id: number): Promise<ActionResult> {
  const staff = await getStaff("manage_suppliers");
  if (!staff) return DENIED;
  const db = await getDb();
  const [row] = await db.delete(suppliers).where(eq(suppliers.id, Number(id))).returning({ name: suppliers.name });
  if (!row) return { ok: false, message: "Supplier not found." };
  await logActivity(staff, "Supplier deleted", row.name);
  revalidatePath("/", "layout");
  return { ok: true, message: "Supplier deleted. Past purchase invoices keep the supplier name." };
}

const purchaseSchema = z.object({
  supplierId: requiredId("supplier"),
  supplierInvoiceNumber: text("Supplier invoice number", 1, 60),
  purchaseDate: dateSchema,
  tax: moneySchema("Tax"),
  items: z
    .array(
      z.object({
        productId: requiredId("product"),
        batchNumber: text("Batch number", 1, 60),
        expiryDate: optionalDate,
        quantity: intSchema("Quantity", 1, 100_000),
        purchasePrice: moneySchema("Purchase price"),
        salePrice: moneySchema("Sale price"),
      }),
    )
    .min(1, "Add at least one product")
    .max(100),
});

export async function createPurchaseAction(payload: unknown): Promise<ActionResult<{ id: number }>> {
  const staff = await getStaff("create_purchases");
  if (!staff) return DENIED;
  const parsed = purchaseSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  if (input.purchaseDate > todayPk()) return { ok: false, message: "Purchase date cannot be in the future.", errors: { purchaseDate: "Cannot be in the future" } };
  const db = await getDb();

  try {
    const id = await db.transaction(async (tx) => {
      const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, input.supplierId));
      if (!supplier) throw new Error("Supplier not found.");
      const productIds = [...new Set(input.items.map((i) => i.productId))];
      const rows = await tx.select().from(products).where(inArray(products.id, productIds)).for("update");
      const byId = new Map(rows.map((r) => [r.id, r]));
      if (byId.size !== productIds.length) throw new Error("One of the selected products no longer exists.");

      const subtotal = round2(input.items.reduce((sum, i) => sum + i.quantity * i.purchasePrice, 0));
      const total = round2(subtotal + input.tax);
      const stamp = todayPk().replace(/-/g, "").slice(2);
      const invoiceNumber = `PI-${stamp}-${String(randomInt(10000, 99999))}`;

      const [purchase] = await tx
        .insert(purchases)
        .values({
          invoiceNumber,
          supplierId: supplier.id,
          supplierName: supplier.company ? `${supplier.name} (${supplier.company})` : supplier.name,
          supplierInvoiceNumber: input.supplierInvoiceNumber,
          purchaseDate: input.purchaseDate,
          subtotal,
          tax: input.tax,
          total,
          createdById: staff.id,
        })
        .returning({ id: purchases.id });

      await tx.insert(purchaseItems).values(
        input.items.map((i) => ({
          purchaseId: purchase.id,
          productId: i.productId,
          productName: byId.get(i.productId)!.name,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate,
          quantity: i.quantity,
          purchasePrice: i.purchasePrice,
          salePrice: i.salePrice,
        })),
      );

      for (const item of input.items) {
        // current stock + purchased quantity, e.g. 20 + 50 = 70
        const [updated] = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} + ${item.quantity}`,
            costPrice: item.purchasePrice,
            ...(item.salePrice > 0 ? { price: item.salePrice } : {}),
            ...(item.expiryDate ? { expiryDate: item.expiryDate } : {}),
          })
          .where(eq(products.id, item.productId))
          .returning({ stock: products.stock });
        await tx.insert(stockMovements).values({
          productId: item.productId,
          change: item.quantity,
          balanceAfter: updated.stock,
          reason: "purchase",
          reference: invoiceNumber,
          note: `Batch ${item.batchNumber}`,
          userId: staff.id,
        });
      }
      await logActivity(staff, "Purchase invoice created", `${invoiceNumber} · ${supplier.name} · ${input.items.length} item(s)`, tx);
      return purchase.id;
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Purchase saved and stock updated.", data: { id } };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not save the purchase." };
  }
}
