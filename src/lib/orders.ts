import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { orderItems, orderStatusHistory, orders } from "./db/schema";

export async function getOrderBundle(where: { orderNumber: string } | { id: number }) {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where("id" in where ? eq(orders.id, where.id) : eq(orders.orderNumber, where.orderNumber.toUpperCase()));
  if (!order) return null;
  const [items, history] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.id)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, order.id)).orderBy(asc(orderStatusHistory.createdAt)),
  ]);
  return { order, items, history };
}

export type OrderBundle = NonNullable<Awaited<ReturnType<typeof getOrderBundle>>>;
