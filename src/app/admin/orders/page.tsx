import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { EmptyState, OrderStatusBadge, PageHeader, Pagination, PaymentStatusBadge } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderStatus, type PaymentMethod } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { cn, escapeLike, formatDateTime, formatMoney } from "@/lib/utils";

export const metadata = { title: "Orders" };
const PER_PAGE = 25;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireStaffPage("view_orders", "manage_orders");
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: SQL[] = [];
  if (status) where.push(eq(orders.status, status));
  if (q) {
    const term = `%${escapeLike(q)}%`;
    where.push(or(ilike(orders.orderNumber, term), ilike(orders.customerName, term), ilike(orders.phone, term), ilike(orders.email, term)) as SQL);
  }
  const db = await getDb();
  const [rows, [{ total }], settings] = await Promise.all([
    db
      .select({
        order: orders,
        // Raw aliases: drizzle drops table qualifiers in single-table selects, which would make these correlated subqueries ambiguous.
        items: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id")`,
        summary: sql<string>`(select string_agg(oi.name || ' × ' || oi.quantity, ', ') from order_items oi where oi.order_id = "orders"."id")`,
      })
      .from(orders)
      .where(and(...where))
      .orderBy(desc(orders.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(orders).where(and(...where)),
    getSettings(),
  ]);

  const href = (over: { status?: string; page?: number }) => {
    const p = new URLSearchParams();
    const st = "status" in over ? over.status : status;
    if (st) p.set("status", st);
    if (q) p.set("q", q);
    if (over.page && over.page > 1) p.set("page", String(over.page));
    const qs = p.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader title="Orders" subtitle={`${total} order${total === 1 ? "" : "s"}`} />
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto">
            {[undefined, ...ORDER_STATUSES].map((s) => (
              <li key={s ?? "all"} className="shrink-0">
                <Link href={href({ status: s })} className={cn("btn btn-sm", status === s ? "btn-primary" : "btn-outline")}>
                  {s ? ORDER_STATUS_LABELS[s] : "All"}
                </Link>
              </li>
            ))}
          </ul>
          <form action="/admin/orders" className="flex gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="order-q" className="sr-only">
              Search orders
            </label>
            <input id="order-q" name="q" defaultValue={q ?? ""} placeholder="Order no., name, phone, email" className="input min-w-0 py-2 lg:w-72" />
            <button type="submit" className="btn btn-primary btn-sm" aria-label="Search">
              <Search className="size-4" />
            </button>
          </form>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<ClipboardList />} title="No orders found" text={q || status ? "Try a different search or status filter." : "Orders will appear here once customers start ordering."} />
        ) : (
          <div className="table-wrap">
            <table className="table-base min-w-[1100px]">
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Products</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ order: o, items, summary }) => (
                  <tr key={o.id}>
                    <td className="font-bold whitespace-nowrap">#{o.orderNumber}</td>
                    <td className="font-medium">{o.customerName}</td>
                    <td className="text-xs text-navy-700">
                      {o.phone}
                      <br />
                      {o.email}
                    </td>
                    <td className="max-w-48 text-xs text-navy-700">
                      {o.address}, {o.city}
                    </td>
                    <td className="max-w-56 text-xs text-navy-700">
                      <span className="line-clamp-2">{summary}</span>
                    </td>
                    <td>{items}</td>
                    <td className="font-semibold whitespace-nowrap">{formatMoney(o.total, settings.currency)}</td>
                    <td className="text-xs">
                      <span className="mb-1 block font-medium whitespace-nowrap">{PAYMENT_METHOD_LABELS[o.paymentMethod as PaymentMethod] ?? o.paymentMethod}</span>
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </td>
                    <td className="text-xs whitespace-nowrap text-navy-700">{formatDateTime(o.createdAt)}</td>
                    <td>
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="btn btn-outline btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} hrefFor={(p) => href({ page: p })} />
    </>
  );
}
