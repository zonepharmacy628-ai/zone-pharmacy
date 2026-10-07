import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/widgets";
import { Logo } from "@/components/brand";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { purchaseItems, purchases, suppliers, users } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Purchase Invoice" };

export default async function PurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("create_purchases", "view_purchases");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const [row] = await db
    .select({ p: purchases, supplier: suppliers, createdBy: users.name })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .leftJoin(users, eq(purchases.createdById, users.id))
    .where(eq(purchases.id, id));
  if (!row) notFound();
  const [items, settings] = await Promise.all([
    db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)).orderBy(asc(purchaseItems.id)),
    getSettings(),
  ]);
  const { p, supplier } = row;
  const c = settings.currency;

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/admin/purchases" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
          <ArrowLeft className="size-4" /> All Purchases
        </Link>
        <PrintButton label="Print Invoice" />
      </div>
      <article className="card mx-auto max-w-4xl p-6 sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <Logo name={settings.pharmacyName} />
            {settings.storeAddress && <p className="mt-3 max-w-xs text-sm text-navy-700">{settings.storeAddress}</p>}
            {settings.storePhone && <p className="text-sm text-navy-700">{settings.storePhone}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Purchase Invoice</h1>
            <p className="mt-1 text-sm font-bold text-brand-700">{p.invoiceNumber}</p>
            <p className="text-sm text-navy-700">Date: {formatDate(p.purchaseDate)}</p>
          </div>
        </header>

        <dl className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Supplier</dt>
            <dd className="mt-1 text-sm">
              <p className="font-bold text-navy-900">{p.supplierName}</p>
              {supplier?.address && <p className="text-navy-700">{supplier.address}</p>}
              {supplier?.phone && <p className="text-navy-700">{supplier.phone}</p>}
              {supplier?.email && <p className="text-navy-700">{supplier.email}</p>}
            </dd>
          </div>
          <div className="sm:text-right">
            <dt className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Supplier Invoice Number</dt>
            <dd className="mt-1 text-sm font-bold text-navy-900">{p.supplierInvoiceNumber || "—"}</dd>
            {row.createdBy && <dd className="mt-2 text-xs text-navy-500">Recorded by {row.createdBy}</dd>}
          </div>
        </dl>

        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Product</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Purchase Price</th>
                <th className="text-right">Sale Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">{i.productName}</td>
                  <td>{i.batchNumber || "—"}</td>
                  <td className="whitespace-nowrap">{i.expiryDate ? formatDate(i.expiryDate) : "—"}</td>
                  <td className="text-right">{i.quantity}</td>
                  <td className="text-right whitespace-nowrap">{formatMoney(i.purchasePrice, c)}</td>
                  <td className="text-right whitespace-nowrap">{formatMoney(i.salePrice, c)}</td>
                  <td className="text-right font-semibold whitespace-nowrap">{formatMoney(i.purchasePrice * i.quantity, c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-navy-700">Subtotal</dt>
            <dd className="font-semibold">{formatMoney(p.subtotal, c)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-navy-700">Tax</dt>
            <dd className="font-semibold">{formatMoney(p.tax, c)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3">
            <dt className="text-base font-bold text-navy-900">Total Amount</dt>
            <dd className="text-lg font-extrabold text-brand-700">{formatMoney(p.total, c)}</dd>
          </div>
        </dl>
      </article>
    </>
  );
}
