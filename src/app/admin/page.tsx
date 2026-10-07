import { and, desc, eq, gte, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import {
  Boxes,
  CalendarClock,
  ClipboardList,
  ClipboardPlus,
  Hourglass,
  Package,
  Receipt,
  ShieldAlert,
  TrendingUp,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { EmptyState, OrderStatusBadge, PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { EXPIRING_SOON_DAYS, ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { activityLogs, medicineRequests, orders, products, purchases, users } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, formatDateTime, formatMoney, pkDayStart, todayPk } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#38bdf8",
  processing: "#6366f1",
  shipped: "#7558ec",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

function StatCard({ label, value, icon: Icon, href, tone = "brand" }: { label: string; value: string | number; icon: LucideIcon; href?: string; tone?: "brand" | "amber" | "red" }) {
  const tones = { brand: "bg-brand-100 text-brand-600", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600" };
  const body = (
    <>
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", tones[tone])}>
        <Icon className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-navy-500">{label}</span>
        <span className="block truncate text-2xl font-extrabold text-navy-900">{value}</span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} className="card flex items-center gap-4 p-5 transition hover:border-brand-300">
      {body}
    </Link>
  ) : (
    <div className="card flex items-center gap-4 p-5">{body}</div>
  );
}

function SalesChart({ points, currency }: { points: { day: string; sales: number }[]; currency: string }) {
  const max = Math.max(...points.map((p) => p.sales), 1);
  const w = 640;
  const h = 200;
  const step = w / (points.length - 1);
  const xy = points.map((p, i) => [i * step, h - (p.sales / max) * (h - 20) - 4] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`-8 0 ${w + 16} ${h + 4}`} className="h-52 w-full" role="img" aria-label="Sales for the last 14 days" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7558ec" stopOpacity=".28" />
            <stop offset="1" stopColor="#7558ec" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={w} y1={h - f * (h - 20) - 4} y2={h - f * (h - 20) - 4} stroke="#e7e5f5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#sales-fill)" />
        <path d={line} fill="none" stroke="#5a3fd8" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-navy-500">
        <span>{formatDate(points[0].day)}</span>
        <span>Peak: {formatMoney(max === 1 ? 0 : max, currency)}</span>
        <span>{formatDate(points[points.length - 1].day)}</span>
      </figcaption>
    </figure>
  );
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireStaffPage();
  const { denied } = await searchParams;
  const db = await getDb();
  const settings = await getSettings();
  const c = settings.currency;
  const count = sql<number>`count(*)::int`;
  const pkDay = sql<string>`to_char(((${orders.createdAt} at time zone 'UTC') + interval '5 hours')::date, 'YYYY-MM-DD')`;
  const since = pkDayStart(todayPk(-13));
  const seesOrders = can(user, "view_orders", "manage_orders");
  const seesSales = can(user, "view_reports");
  const seesStock = can(user, "manage_stock", "manage_products");

  const [[o], [pending], [sales], [prod], [low], [expiring], [req], [pur], [staff], daily, statuses, recentOrders, lowStock, activity] = await Promise.all([
    db.select({ n: count }).from(orders),
    db.select({ n: count }).from(orders).where(eq(orders.status, "pending")),
    db.select({ n: sql<number>`coalesce(sum(${orders.total}), 0)::float8` }).from(orders).where(ne(orders.status, "cancelled")),
    db.select({ n: count }).from(products),
    db.select({ n: count }).from(products).where(lte(products.stock, products.lowStockThreshold)),
    db.select({ n: count }).from(products).where(and(isNotNull(products.expiryDate), lte(products.expiryDate, todayPk(EXPIRING_SOON_DAYS)))),
    db.select({ n: count }).from(medicineRequests).where(inArray(medicineRequests.status, ["new", "in_review"])),
    db.select({ n: count }).from(purchases),
    db.select({ n: count }).from(users).where(ne(users.role, "customer")),
    db
      .select({ day: pkDay, sales: sql<number>`coalesce(sum(${orders.total}), 0)::float8` })
      .from(orders)
      .where(and(gte(orders.createdAt, since), ne(orders.status, "cancelled")))
      .groupBy(pkDay),
    db.select({ status: orders.status, n: count }).from(orders).groupBy(orders.status),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(6),
    db
      .select({ id: products.id, name: products.name, stock: products.stock, threshold: products.lowStockThreshold })
      .from(products)
      .where(lte(products.stock, products.lowStockThreshold))
      .orderBy(products.stock)
      .limit(6),
    db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(6),
  ]);

  const byDay = new Map(daily.map((d) => [d.day, d.sales]));
  const points = Array.from({ length: 14 }, (_, i) => {
    const day = todayPk(i - 13);
    return { day, sales: byDay.get(day) ?? 0 };
  });
  const statusCount = new Map(statuses.map((s) => [s.status, s.n]));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${user.name.split(" ")[0]}! Here's what's happening with your pharmacy today.`} />
      {denied && (
        <p role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          <ShieldAlert className="size-5 shrink-0" /> You don&apos;t have permission to open that page. Ask the owner if you need access.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {seesOrders && <StatCard label="Total Orders" value={o.n} icon={ClipboardList} href="/admin/orders" />}
        {seesOrders && <StatCard label="Pending Orders" value={pending.n} icon={Hourglass} href="/admin/orders?status=pending" tone="amber" />}
        {seesSales && <StatCard label="Total Sales" value={formatMoney(sales.n, c)} icon={TrendingUp} href="/admin/reports" />}
        {seesStock && <StatCard label="Products" value={prod.n} icon={Package} href={can(user, "manage_products") ? "/admin/products" : "/admin/inventory"} />}
        {seesStock && <StatCard label="Low Stock" value={low.n} icon={Boxes} href={can(user, "manage_stock") ? "/admin/inventory?filter=low" : "/admin/products"} tone="red" />}
        {seesStock && <StatCard label="Expiring Products" value={expiring.n} icon={CalendarClock} href="/admin/expiry" tone="amber" />}
        {can(user, "manage_requests") && <StatCard label="Medicine Requests" value={req.n} icon={ClipboardPlus} href="/admin/requests" />}
        {can(user, "create_purchases", "view_purchases") && <StatCard label="Purchases" value={pur.n} icon={Receipt} href="/admin/purchases" />}
        {user.role === "owner" && <StatCard label="Staff" value={staff.n} icon={UserCog} href="/admin/staff" />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {seesSales && (
          <section className="card p-5 sm:p-6 xl:col-span-2" aria-labelledby="dash-sales">
            <h2 id="dash-sales" className="h-section">
              Sales Overview
            </h2>
            <p className="mb-4 text-sm text-navy-500">Daily sales for the last 14 days</p>
            <SalesChart points={points} currency={c} />
          </section>
        )}

        {seesOrders && (
          <section className="card p-5 sm:p-6" aria-labelledby="dash-status">
            <h2 id="dash-status" className="h-section mb-4">
              Order Status
            </h2>
            {o.n === 0 ? (
              <p className="py-8 text-center text-sm text-navy-500">No orders yet.</p>
            ) : (
              <ul className="space-y-3">
                {ORDER_STATUSES.map((s) => {
                  const n = statusCount.get(s) ?? 0;
                  const pct = Math.round((n / o.n) * 100);
                  return (
                    <li key={s}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-navy-800">
                          <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} /> {ORDER_STATUS_LABELS[s]}
                        </span>
                        <span className="text-navy-500">
                          {n} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: STATUS_COLORS[s] }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {seesOrders && (
          <section className="card xl:col-span-2" aria-labelledby="dash-orders">
            <div className="flex items-center justify-between p-5 pb-3 sm:p-6 sm:pb-3">
              <h2 id="dash-orders" className="h-section">
                Recent Orders
              </h2>
              <Link href="/admin/orders" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                View All Orders →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <EmptyState icon={<ClipboardList />} title="No orders yet" text="New orders will appear here as customers place them." />
            ) : (
              <div className="table-wrap">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Order No.</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((r) => (
                      <tr key={r.id}>
                        <td className="font-bold">#{r.orderNumber}</td>
                        <td>{r.customerName}</td>
                        <td className="whitespace-nowrap text-navy-700">{formatDate(r.createdAt)}</td>
                        <td className="font-semibold whitespace-nowrap">{formatMoney(r.total, c)}</td>
                        <td>
                          <OrderStatusBadge status={r.status} />
                        </td>
                        <td>
                          <Link href={`/admin/orders/${r.id}`} className="btn btn-outline btn-sm">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {seesStock && (
          <section className="card p-5 sm:p-6" aria-labelledby="dash-low">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="dash-low" className="h-section">
                Low Stock Alerts
              </h2>
              {can(user, "manage_stock") && (
                <Link href="/admin/inventory?filter=low" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                  View All →
                </Link>
              )}
            </div>
            {lowStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-navy-500">All products are well stocked.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-navy-900">{p.name}</span>
                    <span className={cn("badge", p.stock === 0 ? "bg-red-600 text-white" : "bg-red-50 text-red-700")}>{p.stock === 0 ? "Out" : p.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {user.role === "owner" && (
          <section className="card p-5 sm:p-6 xl:col-span-3" aria-labelledby="dash-activity">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="dash-activity" className="h-section">
                Recent Activity
              </h2>
              <Link href="/admin/activity" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                View All →
              </Link>
            </div>
            {activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-navy-500">Staff actions will be listed here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {activity.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
                    <span>
                      <span className="font-semibold text-navy-900">{a.action}</span> <span className="text-navy-700">{a.details}</span>
                    </span>
                    <span className="text-xs text-navy-500">
                      {a.userName} · {formatDateTime(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
