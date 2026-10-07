import { asc, desc, eq } from "drizzle-orm";
import { AddressManager } from "@/components/store/forms";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addresses } from "@/lib/db/schema";

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const db = await getDb();
  const rows = await db
    .select({
      id: addresses.id,
      label: addresses.label,
      fullName: addresses.fullName,
      phone: addresses.phone,
      address: addresses.address,
      city: addresses.city,
      isDefault: addresses.isDefault,
    })
    .from(addresses)
    .where(eq(addresses.userId, user.id))
    .orderBy(desc(addresses.isDefault), asc(addresses.id));
  return (
    <section className="card p-5 sm:p-6">
      <h1 className="h-page mb-1">Saved Addresses</h1>
      <AddressManager addresses={rows} />
    </section>
  );
}
