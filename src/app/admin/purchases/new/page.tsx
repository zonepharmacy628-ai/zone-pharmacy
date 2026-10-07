import { asc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PurchaseForm } from "@/components/admin/inventory-forms";
import { PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { products, suppliers } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { todayPk } from "@/lib/utils";

export const metadata = { title: "New Purchase" };

export default async function NewPurchasePage() {
  await requireStaffPage("create_purchases");
  const db = await getDb();
  const [supplierRows, productRows, settings] = await Promise.all([
    db.select({ id: suppliers.id, name: suppliers.name, company: suppliers.company }).from(suppliers).orderBy(asc(suppliers.name)),
    db
      .select({ id: products.id, name: products.name, stock: products.stock, price: products.price, costPrice: products.costPrice })
      .from(products)
      .orderBy(asc(products.name)),
    getSettings(),
  ]);
  return (
    <>
      <Link href="/admin/purchases" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="size-4" /> All Purchases
      </Link>
      <PageHeader title="New Purchase" subtitle="Saving a purchase adds the quantities to stock automatically." />
      <PurchaseForm suppliers={supplierRows} products={productRows} today={todayPk()} currency={settings.currency} />
    </>
  );
}
