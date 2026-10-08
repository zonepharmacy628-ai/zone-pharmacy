import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { OrderRowActions } from "@/components/admin/order-controls";
import { EmptyState, OrderStatusBadge, PageHeader, Pagination, PaymentStatusBadge } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderStatus, type PaymentMethod } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { cn, escapeLike, formatDateTime, formatMoney } from "@/lib/utils";

export const metadata = { title: "Orders" };
const PER_PAGE = 25;

function Info({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-semibold tracking-wide text-navy-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm break-words text-navy-900">{children}</dd>
    </div>
  );
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const user = await requireStaffPage("view_orders", "manage_orders");
  const canManage = can(user, "manage_orders");
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
        <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
          <ul className="flex flex-wrap gap-2">
            {[undefined, ...ORDER_STATUSES].map((s) => (
              <li key={s ?? "all"}>
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
            <input id="order-q" name="q" defaultValue={q ?? ""} placeholder="Order no., name, phone, email" className="input min-w-0 flex-1 py-2 xl:w-72 xl:flex-none" />
            <button type="submit" className="btn btn-primary btn-sm" aria-label="Search">
              <Search className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card mt-4">
          <EmptyState icon={<ClipboardList />} title="No orders found" text={q || status ? "Try a different search or status filter." : "Orders will appear here once customers start ordering."} />
        </div>
      ) : (
        // One card per order: details on the left, the Actions panel always on the right (below on phones).
        // Nothing here scrolls sideways at any screen width.
        <ul className="mt-4 space-y-4">
          {rows.map(({ order: o, items, summary }) => (
            <li key={o.id} className="card grid overflow-hidden md:grid-cols-[minmax(0,1fr)_15rem]">
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 p-4 sm:grid-cols-3 sm:p-5 xl:grid-cols-4">
                <Info label="Order No.">
                  <Link href={`/admin/orders/${o.id}`} className="font-bold hover:text-brand-600">
                    #{o.orderNumber}
                  </Link>
                </Info>
                <Info label="Status">
                  <OrderStatusBadge status={o.status} />
                </Info>
                <Info label="Customer">
                  <span className="font-medium">{o.customerName}</span>
                </Info>
                <Info label="Contact">
                  {o.phone}
                  <br />
                  <span className="text-navy-700">{o.email}</span>
                </Info>
                <Info label="Address" className="col-span-2 sm:col-span-1 xl:col-span-2">
                  {o.address}, {o.city}
                </Info>
                <Info label="Products" className="col-span-2">
                  {summary}
                </Info>
                <Info label="Qty">{items}</Info>
                <Info label="Total">
                  <span className="font-bold">{formatMoney(o.total, settings.currency)}</span>
                </Info>
                <Info label="Payment">
                  <span className="mb-1 block font-medium">{PAYMENT_METHOD_LABELS[o.paymentMethod as PaymentMethod] ?? o.paymentMethod}</span>
                  <PaymentStatusBadge status={o.paymentStatus} />
                </Info>
                <Info label="Date">{formatDateTime(o.createdAt)}</Info>
              </dl>
              <div className="border-t border-line bg-surface p-4 md:border-t-0 md:border-l">
                <p className="mb-3 text-[11px] font-semibold tracking-wide text-navy-500 uppercase">Actions</p>
                <OrderRowActions orderId={o.id} orderNumber={o.orderNumber} status={o.status as OrderStatus} canManage={canManage} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} hrefFor={(p) => href({ page: p })} />
    </>
  );
}
