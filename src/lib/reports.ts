import "server-only";
import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import { getDb } from "./db";
import { categories, orderItems, orders } from "./db/schema";
import { pkDayStart, round2, todayPk } from "./utils";

export const REPORT_PRESETS = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  month: "This Month",
  custom: "Custom Range",
} as const;
export type ReportPreset = keyof typeof REPORT_PRESETS;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves a preset (or custom dates) to an inclusive YYYY-MM-DD range in Pakistan time. */
export function resolveRange(preset: string | undefined, from?: string, to?: string) {
  const today = todayPk();
  let p: ReportPreset = preset && preset in REPORT_PRESETS ? (preset as ReportPreset) : "today";
  let start = today;
  let end = today;
  if (p === "yesterday") start = end = todayPk(-1);
  else if (p === "week") {
    // Week starts on Monday.
    const dow = (new Date(`${today}T12:00:00+05:00`).getUTCDay() + 6) % 7;
    start = todayPk(-dow);
  } else if (p === "month") start = `${today.slice(0, 8)}01`;
  else if (p === "custom") {
    if (from && to && YMD.test(from) && YMD.test(to) && from <= to) {
      start = from;
      end = to;
    } else p = "today";
  }
  return { preset: p, from: start, to: end };
}

export async function getSalesReport(from: string, to: string) {
  const db = await getDb();
  const start = pkDayStart(from);
  const end = new Date(pkDayStart(to).getTime() + 86_400_000);
  const inRange = and(gte(orders.createdAt, start), lt(orders.createdAt, end));
  const live = and(inRange, ne(orders.status, "cancelled"));
  const num = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)::float8`;

  const [[totals], byMethod, [cancelled], byProduct, byCategory] = await Promise.all([
    db
      .select({ orders: sql<number>`count(*)::int`, sales: num(sql`sum(${orders.total})`), delivery: num(sql`sum(${orders.deliveryCharge})`) })
      .from(orders)
      .where(live),
    db
      .select({ method: orders.paymentMethod, sales: num(sql`sum(${orders.total})`), orders: sql<number>`count(*)::int` })
      .from(orders)
      .where(live)
      .groupBy(orders.paymentMethod),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(inRange, eq(orders.status, "cancelled"))),
    db
      .select({
        name: orderItems.name,
        quantity: sql<number>`sum(${orderItems.quantity})::int`,
        sales: num(sql`sum(${orderItems.price} * ${orderItems.quantity})`),
        cost: num(sql`sum(${orderItems.costPrice} * ${orderItems.quantity})`),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(live)
      .groupBy(orderItems.name)
      .orderBy(sql`sum(${orderItems.price} * ${orderItems.quantity}) desc`),
    db
      .select({
        name: sql<string>`coalesce(${categories.name}, 'Uncategorised')`,
        quantity: sql<number>`sum(${orderItems.quantity})::int`,
        sales: num(sql`sum(${orderItems.price} * ${orderItems.quantity})`),
        cost: num(sql`sum(${orderItems.costPrice} * ${orderItems.quantity})`),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(categories, eq(orderItems.categoryId, categories.id))
      .where(live)
      .groupBy(sql`coalesce(${categories.name}, 'Uncategorised')`)
      .orderBy(sql`sum(${orderItems.price} * ${orderItems.quantity}) desc`),
  ]);

  const method = (m: string) => byMethod.find((r) => r.method === m)?.sales ?? 0;
  const productsSold = byProduct.reduce((n, r) => n + r.quantity, 0);
  const netSales = round2(totals.sales - totals.delivery);
  const purchaseCost = round2(byProduct.reduce((n, r) => n + r.cost, 0));
  const withProfit = <T extends { sales: number; cost: number }>(r: T) => ({ ...r, profit: round2(r.sales - r.cost) });

  return {
    from,
    to,
    totalOrders: totals.orders,
    totalSales: round2(totals.sales),
    productsSold,
    deliveryCharges: round2(totals.delivery),
    netSales,
    codSales: round2(method("cod")),
    jazzcashSales: round2(method("jazzcash")),
    bankSales: round2(method("bank")),
    cancelledOrders: cancelled.n,
    purchaseCost,
    // Gross Profit = Sales − Purchase Cost (product sales, excluding delivery charges)
    grossProfit: round2(netSales - purchaseCost),
    byProduct: byProduct.map(withProfit),
    byCategory: byCategory.map(withProfit),
  };
}

export type SalesReport = Awaited<ReturnType<typeof getSalesReport>>;
