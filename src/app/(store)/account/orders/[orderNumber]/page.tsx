import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import { ReorderButton } from "@/components/store/forms";
import { OrderItemsTable, OrderParties, OrderTimeline } from "@/components/store/order-view";
import { OrderStatusBadge } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getOrderBundle } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";

export default async function AccountOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await requireUser(`/account/orders/${orderNumber}`);
  const [bundle, settings] = await Promise.all([getOrderBundle({ orderNumber }), getSettings()]);
  if (!bundle || bundle.order.userId !== user.id) notFound();
  const { order, items, history } = bundle;

  const ids = items.map((i) => i.productId).filter((id): id is number => id !== null);
  const db = await getDb();
  const slugs = ids.length ? await db.select({ id: products.id, slug: products.slug, name: products.name }).from(products).where(inArray(products.id, ids)) : [];

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="size-4" /> Back to Orders
      </Link>
      <section className="card p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h-page">Order #{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-navy-500">Placed on {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <ReorderButton orderNumber={order.orderNumber} className="btn btn-primary btn-sm" />
          </div>
        </div>
        <OrderTimeline status={order.status} history={history} />
      </section>

      {order.status === "delivered" && slugs.length > 0 && (
        <section className="card p-5 sm:p-6" aria-labelledby="rate-items">
          <h2 id="rate-items" className="h-section mb-1">
            Rate Your Products
          </h2>
          <p className="mb-4 text-sm text-navy-500">Your order was delivered. Share your experience to help other customers.</p>
          <ul className="flex flex-wrap gap-2">
            {slugs.map((p) => (
              <li key={p.id}>
                <Link href={`/product/${p.slug}#reviews`} className="btn btn-outline btn-sm">
                  <Star className="size-3.5" /> Review {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5 sm:p-6">
        <h2 className="h-section mb-2">Items</h2>
        <OrderItemsTable bundle={bundle} currency={settings.currency} />
      </section>
      <section className="card p-5 sm:p-6">
        <OrderParties bundle={bundle} />
      </section>
    </div>
  );
}
