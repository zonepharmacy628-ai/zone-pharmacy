"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { addresses, products, reviews, users, wishlist } from "@/lib/db/schema";
import { canReview } from "@/lib/reviews";
import { formObject, invalid, rateLimit, TOO_MANY } from "@/lib/server-utils";
import { checkbox, idSchema, nameSchema, optionalId, optionalText, phoneSchema, text } from "@/lib/validators";

const SIGN_IN = { ok: false as const, message: "Please sign in to continue." };

export async function updateProfileAction(fd: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return SIGN_IN;
  const parsed = z.object({ name: nameSchema, phone: phoneSchema }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const db = await getDb();
  await db.update(users).set(parsed.data).where(eq(users.id, me.id));
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated." };
}

const addressSchema = z.object({
  id: optionalId,
  label: z.enum(["home", "office", "other"]),
  fullName: text("Full name", 2, 80),
  phone: phoneSchema,
  address: text("Address", 8, 300),
  city: text("City", 2, 60),
  isDefault: checkbox,
});

export async function saveAddressAction(fd: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return SIGN_IN;
  const parsed = addressSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(addresses).where(eq(addresses.userId, me.id));
    let savedId = id;
    if (id) {
      const [row] = await tx
        .update(addresses)
        .set(data)
        .where(and(eq(addresses.id, id), eq(addresses.userId, me.id)))
        .returning({ id: addresses.id });
      if (!row) return "Address not found.";
    } else {
      if (count >= 10) return "You can save up to 10 addresses.";
      const [row] = await tx
        .insert(addresses)
        .values({ ...data, userId: me.id, isDefault: data.isDefault || count === 0 })
        .returning({ id: addresses.id });
      savedId = row.id;
    }
    if (data.isDefault && savedId) {
      await tx.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, me.id), ne(addresses.id, savedId)));
    }
    return null;
  });
  if (result) return { ok: false, message: result };
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Address updated." : "Address saved." };
}

export async function deleteAddressAction(id: number): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return SIGN_IN;
  const db = await getDb();
  const [removed] = await db
    .delete(addresses)
    .where(and(eq(addresses.id, Number(id)), eq(addresses.userId, me.id)))
    .returning({ isDefault: addresses.isDefault });
  if (!removed) return { ok: false, message: "Address not found." };
  if (removed.isDefault) {
    const [next] = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, me.id)).limit(1);
    if (next) await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Address deleted." };
}

export async function toggleWishlistAction(productId: number): Promise<ActionResult<{ inWishlist: boolean }>> {
  const me = await getCurrentUser();
  if (!me) return SIGN_IN;
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Product not found." };
  const db = await getDb();
  const removed = await db
    .delete(wishlist)
    .where(and(eq(wishlist.userId, me.id), eq(wishlist.productId, id)))
    .returning({ productId: wishlist.productId });
  if (removed.length) {
    revalidatePath("/", "layout");
    return { ok: true, message: "Removed from wishlist.", data: { inWishlist: false } };
  }
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
  if (!product) return { ok: false, message: "Product not found." };
  await db.insert(wishlist).values({ userId: me.id, productId: id }).onConflictDoNothing();
  revalidatePath("/", "layout");
  return { ok: true, message: "Added to wishlist.", data: { inWishlist: true } };
}

const reviewSchema = z.object({
  productId: idSchema,
  rating: z.coerce.number({ error: "Choose a rating" }).int().min(1, "Choose a rating").max(5),
  comment: optionalText(1000),
});

export async function submitReviewAction(fd: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return SIGN_IN;
  if (!(await rateLimit("review", 20, 3600, String(me.id)))) return TOO_MANY;
  const parsed = reviewSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { productId, rating, comment } = parsed.data;
  if (!(await canReview(me.id, productId))) {
    return { ok: false, message: "You can review a product once your order containing it has been delivered." };
  }
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .insert(reviews)
      .values({ productId, userId: me.id, rating, comment })
      .onConflictDoUpdate({ target: [reviews.productId, reviews.userId], set: { rating, comment, createdAt: new Date() } });
    const [agg] = await tx
      .select({ avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`, count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.productId, productId));
    await tx
      .update(products)
      .set({ ratingAvg: Math.round(Number(agg.avg) * 100) / 100, ratingCount: agg.count })
      .where(eq(products.id, productId));
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Thank you for your review!" };
}
