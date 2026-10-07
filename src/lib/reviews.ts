import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { orderItems, orders } from "./db/schema";

/** A customer may review a product only after an order containing it was delivered. */
export async function canReview(userId: number, productId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, userId), eq(orders.status, "delivered"), eq(orderItems.productId, productId)))
    .limit(1);
  return Boolean(row);
}
