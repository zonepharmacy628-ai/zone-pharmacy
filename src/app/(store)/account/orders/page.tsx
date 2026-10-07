import { desc, eq } from "drizzle-orm";
import { OrdersTable } from "@/components/store/orders-table";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";

export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");
  const db = await getDb();
  const [rows, settings] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(200),
    getSettings(),
  ]);
  return (
    <section className="card p-5 sm:p-6">
      <h1 className="h-page mb-1">My Orders</h1>
      <p className="mb-5 text-sm text-navy-500">Your order history. Open an order to see its details or order it again.</p>
      <OrdersTable orders={rows} currency={settings.currency} />
    </section>
  );
}
