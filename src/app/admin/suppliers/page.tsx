import { asc } from "drizzle-orm";
import { SupplierManager } from "@/components/admin/catalog-forms";
import { PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";

export const metadata = { title: "Suppliers" };

export default async function AdminSuppliersPage() {
  await requireStaffPage("manage_suppliers");
  const db = await getDb();
  const rows = await db
    .select({ id: suppliers.id, name: suppliers.name, company: suppliers.company, phone: suppliers.phone, address: suppliers.address, email: suppliers.email })
    .from(suppliers)
    .orderBy(asc(suppliers.name));
  return (
    <>
      <PageHeader title="Suppliers" subtitle="The companies you purchase stock from." />
      <SupplierManager suppliers={rows} />
    </>
  );
}
