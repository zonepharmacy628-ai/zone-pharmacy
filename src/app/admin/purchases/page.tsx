import { desc, sql } from "drizzle-orm";
import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { purchases } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Purchases" };
const PER_PAGE = 25;

export default async function AdminPurchasesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireStaffPage("create_purchases", "view_purchases");
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const db = await getDb();
  const [rows, [{ total }], settings] = await Promise.all([
    db
      .select({
        p: purchases,
        items: sql<number>`(select count(*)::int from purchase_items pi where pi.purchase_id = "purchases"."id")`,
      })
      .from(purchases)
      .orderBy(desc(purchases.purchaseDate), desc(purchases.id))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(purchases),
    getSettings(),
  ]);
  const canCreate = can(user, "create_purchases");

  return (
    <>
      <PageHeader title="Purchases" subtitle="Purchase history and supplier invoices.">
        {canCreate && (
          <Link href="/admin/purchases/new" className="btn btn-primary">
            <Plus className="size-4" /> New Purchase
          </Link>
        )}
      </PageHeader>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="No purchases yet"
            text="Record a purchase to add stock and keep your purchase history."
            action={
              canCreate && (
                <Link href="/admin/purchases/new" className="btn btn-primary">
                  New Purchase
                </Link>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Supplier</th>
                  <th>Supplier Invoice</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, items }) => (
                  <tr key={p.id}>
                    <td className="font-bold whitespace-nowrap">{p.invoiceNumber}</td>
                    <td>{p.supplierName}</td>
                    <td>{p.supplierInvoiceNumber || "—"}</td>
                    <td className="whitespace-nowrap">{formatDate(p.purchaseDate)}</td>
                    <td>{items}</td>
                    <td className="font-semibold whitespace-nowrap">{formatMoney(p.total, settings.currency)}</td>
                    <td>
                      <Link href={`/admin/purchases/${p.id}`} className="btn btn-outline btn-sm">
                        View Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} hrefFor={(p) => (p > 1 ? `/admin/purchases?page=${p}` : "/admin/purchases")} />
    </>
  );
}
