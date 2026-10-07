import { asc, eq, isNotNull } from "drizzle-orm";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { EXPIRING_SOON_DAYS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { products, purchaseItems, purchases } from "@/lib/db/schema";
import { cn, expiryStatus, formatDate, type ExpiryStatus } from "@/lib/utils";

export const metadata = { title: "Expiry Management" };

const LABELS: Record<Exclude<ExpiryStatus, "none">, { label: string; tone: "green" | "amber" | "red" }> = {
  valid: { label: "Valid", tone: "green" },
  expiring: { label: "Expiring Soon", tone: "amber" },
  expired: { label: "Expired", tone: "red" },
};

type Row = { key: string; product: string; batch: string; source: string; expiry: string; stock: number | null; status: Exclude<ExpiryStatus, "none"> };

export default async function AdminExpiryPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("manage_stock", "manage_products");
  const { status } = await searchParams;
  const filter = (["valid", "expiring", "expired"] as const).find((s) => s === status);
  const db = await getDb();
  const [productRows, batchRows] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, expiry: products.expiryDate, stock: products.stock })
      .from(products)
      .where(isNotNull(products.expiryDate))
      .orderBy(asc(products.expiryDate)),
    db
      .select({ id: purchaseItems.id, name: purchaseItems.productName, batch: purchaseItems.batchNumber, expiry: purchaseItems.expiryDate, qty: purchaseItems.quantity, invoice: purchases.invoiceNumber })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
      .where(isNotNull(purchaseItems.expiryDate))
      .orderBy(asc(purchaseItems.expiryDate))
      .limit(500),
  ]);

  const productList: Row[] = productRows.map((p) => ({
    key: `p${p.id}`,
    product: p.name,
    batch: "—",
    source: "Product record",
    expiry: p.expiry!,
    stock: p.stock,
    status: expiryStatus(p.expiry) as Row["status"],
  }));
  const batchList: Row[] = batchRows.map((b) => ({
    key: `b${b.id}`,
    product: b.name,
    batch: b.batch || "—",
    source: b.invoice,
    expiry: b.expiry!,
    stock: b.qty,
    status: expiryStatus(b.expiry) as Row["status"],
  }));
  const counts = { valid: 0, expiring: 0, expired: 0 };
  for (const r of productList) counts[r.status]++;
  const show = (rows: Row[]) => (filter ? rows.filter((r) => r.status === filter) : rows);

  const table = (rows: Row[], stockLabel: string, sourceLabel: string) =>
    rows.length === 0 ? (
      <EmptyState icon={<CalendarClock />} title="Nothing to show" text="No items match this filter." />
    ) : (
      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th>Product</th>
              <th>Batch</th>
              <th>{sourceLabel}</th>
              <th>Expiry Date</th>
              <th>{stockLabel}</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="font-medium text-navy-900">{r.product}</td>
                <td>{r.batch}</td>
                <td className="text-navy-700">{r.source}</td>
                <td className="whitespace-nowrap">{formatDate(r.expiry)}</td>
                <td>{r.stock}</td>
                <td>
                  <Badge tone={LABELS[r.status].tone}>{LABELS[r.status].label}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <>
      <PageHeader title="Expiry Management" subtitle={`"Expiring Soon" means within ${EXPIRING_SOON_DAYS} days.`} />
      <ul className="mb-6 flex flex-wrap gap-2">
        <li>
          <Link href="/admin/expiry" className={cn("btn btn-sm", !filter ? "btn-primary" : "btn-outline")}>
            All
          </Link>
        </li>
        {(["expired", "expiring", "valid"] as const).map((s) => (
          <li key={s}>
            <Link href={`/admin/expiry?status=${s}`} className={cn("btn btn-sm", filter === s ? "btn-primary" : "btn-outline")}>
              {LABELS[s].label} ({counts[s]})
            </Link>
          </li>
        ))}
      </ul>

      <section className="card" aria-labelledby="exp-products">
        <h2 id="exp-products" className="h-section p-5 pb-3">
          Products
        </h2>
        {table(show(productList), "Current Stock", "Source")}
      </section>

      <section className="card mt-6" aria-labelledby="exp-batches">
        <h2 id="exp-batches" className="h-section p-5 pb-1">
          Purchased Batches
        </h2>
        <p className="px-5 pb-3 text-sm text-navy-500">Every batch received through a purchase invoice.</p>
        {table(show(batchList), "Qty Purchased", "Purchase Invoice")}
      </section>
    </>
  );
}
