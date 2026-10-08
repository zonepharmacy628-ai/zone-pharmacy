"use server";

import { randomBytes, randomInt } from "node:crypto";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { productsByIds, type ProductCardData } from "@/lib/catalog";
import { MAX_CART_QTY, PAYMENT_METHODS, type ActionResult } from "@/lib/constants";
import { getDb } from "@/lib/db";
import {
  addresses,
  categories,
  medicineRequests,
  orderItems,
  orderStatusHistory,
  orders,
  products,
  stockMovements,
} from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { formObject, hasUpload, invalid, rateLimit, saveUpload, TOO_MANY } from "@/lib/server-utils";
import { getSettings } from "@/lib/settings";
import { deliveryChargeFor } from "@/lib/settings-shared";
import { round2 } from "@/lib/utils";
import { emailSchema, nameSchema, optionalInt, optionalText, phoneSchema, text } from "@/lib/validators";

/** Current price/stock for the ids held in the browser cart. */
export async function getCartProducts(ids: number[]): Promise<ProductCardData[]> {
  const clean = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
  return productsByIds(clean);
}

const itemsSchema = z
  .array(z.object({ id: z.number().int().positive(), qty: z.number().int().min(1).max(MAX_CART_QTY) }))
  .min(1, "Your cart is empty")
  .max(100);

const orderSchema = z.object({
  fullName: text("Full name", 2, 80),
  email: emailSchema,
  phone: phoneSchema,
  address: text("Address", 8, 300),
  city: text("City", 2, 60),
  notes: optionalText(500),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Choose a payment method" }),
  paymentReference: optionalText(60),
  idempotencyKey: z.string().uuid(),
});

class OrderError extends Error {}

const ORDER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function newOrderNumber() {
  // Orders placed before the 24Zone rename keep their "MZ" numbers.
  let s = "24Z";
  for (let i = 0; i < 8; i++) s += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)];
  return s;
}

type Placed = { orderNumber: string; token: string };

export async function placeOrderAction(fd: FormData): Promise<ActionResult<Placed>> {
  if (!(await rateLimit("order", 12, 600))) return TOO_MANY;
  const parsed = orderSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(fd.get("items") ?? "[]"));
  } catch {
    return { ok: false, message: "Your cart could not be read. Please refresh and try again." };
  }
  const itemsParsed = itemsSchema.safeParse(rawItems);
  if (!itemsParsed.success) return { ok: false, message: "Your cart is empty or contains an invalid quantity." };
  // Merge duplicate lines so a product can never be validated twice against the same stock.
  const qtyById = new Map<number, number>();
  for (const it of itemsParsed.data) qtyById.set(it.id, (qtyById.get(it.id) ?? 0) + it.qty);

  const settings = await getSettings();
  const enabled = { cod: settings.codEnabled, jazzcash: settings.jazzcashEnabled, bank: settings.bankEnabled };
  if (!enabled[input.paymentMethod]) {
    return { ok: false, message: "This payment method is not available. Please choose another.", errors: { paymentMethod: "Not available" } };
  }
  if (input.paymentMethod !== "cod" && input.paymentReference.length < 4) {
    return { ok: false, message: "Enter the transaction ID of your payment.", errors: { paymentReference: "Transaction ID is required" } };
  }

  const user = await getCurrentUser();
  const db = await getDb();

  const findExisting = async () => {
    const [o] = await db
      .select({ orderNumber: orders.orderNumber, token: orders.accessToken })
      .from(orders)
      .where(eq(orders.idempotencyKey, input.idempotencyKey));
    return o;
  };
  // A double-click or retry with the same key returns the original order instead of creating a second one.
  const existing = await findExisting();
  if (existing) return { ok: true, data: existing };

  const prescription = fd.get("prescription");
  let orderNumber = newOrderNumber();
  for (let i = 0; i < 3; i++) {
    const [clash] = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNumber, orderNumber));
    if (!clash) break;
    orderNumber = newOrderNumber();
  }
  const token = randomBytes(24).toString("base64url");

  try {
    await db.transaction(async (tx) => {
      const ids = [...qtyById.keys()];
      const rows = await tx.select().from(products).where(inArray(products.id, ids)).for("update");
      const activeCategoryIds = new Set(
        (await tx.select({ id: categories.id }).from(categories).where(eq(categories.active, true))).map((c) => c.id),
      );
      const byId = new Map(rows.map((r) => [r.id, r]));
      const lines = ids.map((id) => {
        const p = byId.get(id);
        const qty = qtyById.get(id)!;
        if (!p || (p.categoryId !== null && !activeCategoryIds.has(p.categoryId))) {
          throw new OrderError("A product in your cart is no longer available. Please review your cart.");
        }
        if (!p.available) throw new OrderError(`${p.name} is currently unavailable. Please remove it from your cart.`);
        if (qty > MAX_CART_QTY) throw new OrderError(`You can order at most ${MAX_CART_QTY} units of ${p.name}.`);
        if (p.stock < qty) {
          throw new OrderError(
            p.stock === 0 ? `${p.name} is out of stock.` : `Only ${p.stock} unit(s) of ${p.name} are in stock.`,
          );
        }
        return { product: p, qty };
      });

      // Prices always come from the database, never from the browser.
      const subtotal = round2(lines.reduce((sum, l) => sum + l.product.price * l.qty, 0));
      const deliveryCharge = deliveryChargeFor(subtotal, settings);
      const total = round2(subtotal + deliveryCharge);

      const needsPrescription = lines.some((l) => l.product.requiresPrescription);
      let prescriptionFileId: string | null = null;
      if (needsPrescription) {
        if (!hasUpload(prescription)) throw new OrderError("Please upload a prescription for the prescription-only items in your cart.");
        const saved = await saveUpload(prescription, "prescription", user?.id ?? null, tx);
        if ("error" in saved) throw new OrderError(saved.error);
        prescriptionFileId = saved.id;
      }

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          accessToken: token,
          idempotencyKey: input.idempotencyKey,
          userId: user?.id ?? null,
          customerName: input.fullName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          notes: input.notes,
          subtotal,
          deliveryCharge,
          total,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentMethod === "cod" ? "" : input.paymentReference,
          paymentStatus: input.paymentMethod === "cod" ? "unpaid" : "pending",
          prescriptionFileId,
          prescriptionStatus: needsPrescription ? "pending" : "none",
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: order.id,
          productId: l.product.id,
          categoryId: l.product.categoryId,
          name: l.product.name,
          price: l.product.price,
          costPrice: l.product.costPrice,
          quantity: l.qty,
        })),
      );

      for (const l of lines) {
        // The stock >= qty guard makes overselling impossible even under concurrent checkouts.
        const [updated] = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${l.qty}`, soldCount: sql`${products.soldCount} + ${l.qty}` })
          .where(and(eq(products.id, l.product.id), gte(products.stock, l.qty)))
          .returning({ stock: products.stock });
        if (!updated) throw new OrderError(`${l.product.name} just went out of stock.`);
        await tx.insert(stockMovements).values({
          productId: l.product.id,
          change: -l.qty,
          balanceAfter: updated.stock,
          reason: "sale",
          reference: orderNumber,
          userId: user?.id ?? null,
        });
      }
      await tx.insert(orderStatusHistory).values({ orderId: order.id, status: "pending", byUserId: user?.id ?? null });

      if (user && fd.get("saveAddress") === "on") {
        const label = ["home", "office", "other"].includes(String(fd.get("addressLabel"))) ? String(fd.get("addressLabel")) : "home";
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(addresses)
          .where(eq(addresses.userId, user.id));
        if (count < 10) {
          await tx.insert(addresses).values({
            userId: user.id,
            label,
            fullName: input.fullName,
            phone: input.phone,
            address: input.address,
            city: input.city,
            isDefault: count === 0,
          });
        }
      }
    });
  } catch (err) {
    if (err instanceof OrderError) return { ok: false, message: err.message };
    const again = await findExisting();
    if (again) return { ok: true, data: again };
    console.error("[placeOrder]", err);
    return { ok: false, message: "We could not place your order. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Order placed successfully!", data: { orderNumber, token } };
}

/** Items of a past order that can still be bought, for the Re-order button. */
export async function getReorderItems(orderNumber: string): Promise<ActionResult<{ id: number; qty: number }[]>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to re-order." };
  const db = await getDb();
  const [order] = await db.select({ id: orders.id, userId: orders.userId }).from(orders).where(eq(orders.orderNumber, orderNumber));
  if (!order || (order.userId !== user.id && !can(user, "view_orders"))) return { ok: false, message: "Order not found." };
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const live = await productsByIds(items.map((i) => i.productId).filter((id): id is number => id !== null));
  const buyable = new Map(live.filter((p) => p.available && p.stock > 0).map((p) => [p.id, p]));
  const data = items
    .filter((i) => i.productId !== null && buyable.has(i.productId))
    .map((i) => ({ id: i.productId!, qty: Math.min(i.quantity, buyable.get(i.productId!)!.stock, MAX_CART_QTY) }));
  if (!data.length) return { ok: false, message: "None of these items are currently available." };
  const skipped = items.length - data.length;
  return { ok: true, message: skipped ? `${skipped} item(s) are no longer available and were skipped.` : "Items added to your cart.", data };
}

const requestSchema = z.object({
  medicineName: text("Medicine name", 2, 120),
  customerName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  quantity: optionalInt(1, 1000),
  message: optionalText(1000),
});

export async function submitMedicineRequestAction(fd: FormData): Promise<ActionResult> {
  if (!(await rateLimit("medicine-request", 6, 3600))) return TOO_MANY;
  const parsed = requestSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const user = await getCurrentUser();
  const db = await getDb();
  const file = fd.get("prescription");
  let prescriptionFileId: string | null = null;
  if (hasUpload(file)) {
    const saved = await saveUpload(file, "prescription", user?.id ?? null);
    if ("error" in saved) return { ok: false, message: saved.error, errors: { prescription: saved.error } };
    prescriptionFileId = saved.id;
  }
  await db.insert(medicineRequests).values({ ...parsed.data, userId: user?.id ?? null, prescriptionFileId });
  revalidatePath("/", "layout");
  return { ok: true, message: "Request received. Our pharmacist will contact you shortly." };
}
