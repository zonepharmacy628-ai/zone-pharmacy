import { and, asc, desc, eq, ilike, lte, sql, type SQL } from "drizzle-orm";
import { Boxes, History, Search } from "lucide-react";
import Link from "next/link";
import { StockAdjustButton } from "@/components/admin/inventory-forms";
import { Badge, EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { products, stockMovements, users } from "@/lib/db/schema";
import { cn, escapeLike, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Inventory" };
const PER_PAGE = 30;

const REASONS: Record<string, string> = { purchase: "Purchase", sale: "Sale", adjustment: "Manual adjustment", cancellation: "Order cancelled" };

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string; product?: string }> }) {
  await requireStaffPage("manage_stock");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const lowOnly = sp.filter === "low";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const historyFor = Number.parseInt(sp.product ?? "", 10) || undefined;

  const where: SQL[] = [];
  if (q) where.push(ilike(products.name, `%${escapeLike(q)}%`));
  if (lowOnly) where.push(lte(products.stock, products.lowStockThreshold));

  const db = await getDb();
  const [rows, [{ total }], [{ low }], movements] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, brand: products.brand, stock: products.stock, threshold: products.lowStockThreshold })
      .from(products)
      .where(and(...where))
      .orderBy(asc(products.stock), asc(products.name))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(products).where(and(...where)),
    db.select({ low: sql<number>`count(*)::int` }).from(products).where(lte(products.stock, products.lowStockThreshold)),
    db
      .select({ m: stockMovements, productName: products.name, userName: users.name })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.userId, users.id))
      .where(historyFor ? eq(stockMovements.productId, historyFor) : undefined)
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(60),
  ]);
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (lowOnly) params.set("filter", "low");
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/inventory?${qs}` : "/admin/inventory";
  };

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock levels, manual adjustments and stock history." />
      {low > 0 && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {low} product{low === 1 ? " is" : "s are"} at or below the low-stock level.{" "}
          {!lowOnly && (
            <Link href="/admin/inventory?filter=low" className="font-bold underline">
              Show them
            </Link>
          )}
        </p>
      )}
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Link href="/admin/inventory" className={cn("btn btn-sm", !lowOnly ? "btn-primary" : "btn-outline")}>
              All Products
            </Link>
            <Link href="/admin/inventory?filter=low" className={cn("btn btn-sm", lowOnly ? "btn-primary" : "btn-outline")}>
              Low Stock ({low})
            </Link>
          </div>
          <form action="/admin/inventory" className="flex gap-2">
            {lowOnly && <input type="hidden" name="filter" value="low" />}
            <label htmlFor="inv-q" className="sr-only">
              Search products
            </label>
            <input id="inv-q" name="q" defaultValue={q ?? ""} placeholder="Search product" className="input min-w-0 py-2 sm:w-64" />
            <button type="submit" className="btn btn-primary btn-sm" aria-label="Search">
              <Search className="size-4" />
            </button>
          </form>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<Boxes />} title={lowOnly ? "No low-stock products" : "No products found"} text={lowOnly ? "Everything is above its low-stock level." : "Try a different search."} />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Low-Stock Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-semibold text-navy-900">{p.name}</p>
                      <p className="text-xs text-navy-500">{p.brand}</p>
                    </td>
                    <td className="text-base font-bold">{p.stock}</td>
                    <td>{p.threshold}</td>
                    <td>{p.stock === 0 ? <Badge tone="red">Out of stock</Badge> : p.stock <= p.threshold ? <Badge tone="amber">Low stock</Badge> : <Badge tone="green">In stock</Badge>}</td>
                    <td>
                      <div className="flex gap-2">
                        <StockAdjustButton productId={p.id} name={p.name} stock={p.stock} />
                        <Link href={`/admin/inventory?product=${p.id}#history`} className="btn btn-outline btn-sm">
                          <History className="size-3.5" /> History
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} hrefFor={hrefFor} />

      <section id="history" className="card mt-8 scroll-mt-20" aria-labelledby="history-title">
        <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
          <h2 id="history-title" className="h-section">
            Stock History {historyFor && movements[0] ? `— ${movements[0].productName}` : ""}
          </h2>
          {historyFor && (
            <Link href="/admin/inventory#history" className="text-sm font-semibold text-brand-600 hover:underline">
              Show all products
            </Link>
          )}
        </div>
        {movements.length === 0 ? (
          <EmptyState icon={<History />} title="No stock movements yet" text="Purchases, sales and adjustments will be listed here." />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Balance</th>
                  <th>Reference / Note</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(({ m, productName, userName }) => (
                  <tr key={m.id}>
                    <td className="text-xs whitespace-nowrap text-navy-700">{formatDateTime(m.createdAt)}</td>
                    <td className="font-medium">{productName}</td>
                    <td>{REASONS[m.reason] ?? m.reason}</td>
                    <td className={cn("font-bold", m.change > 0 ? "text-emerald-700" : "text-red-600")}>
                      {m.change > 0 ? "+" : ""}
                      {m.change}
                    </td>
                    <td className="font-semibold">{m.balanceAfter}</td>
                    <td className="text-xs text-navy-700">{[m.reference, m.note].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="text-xs text-navy-700">{m.reason === "sale" ? "Customer" : (userName ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
