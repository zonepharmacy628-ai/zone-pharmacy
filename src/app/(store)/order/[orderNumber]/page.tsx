import { timingSafeEqual } from "node:crypto";
import { Check, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderItemsTable, OrderParties, OrderTimeline } from "@/components/store/order-view";
import { Breadcrumbs } from "@/components/store/sections";
import { OrderStatusBadge } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth";
import { getOrderBundle } from "@/lib/orders";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Order Confirmation", robots: { index: false }, referrer: "no-referrer" };

function tokenMatches(expected: string, given: string | undefined) {
  if (!given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ orderNumber }, { t }] = await Promise.all([params, searchParams]);
  const [bundle, user, settings] = await Promise.all([getOrderBundle({ orderNumber }), getCurrentUser(), getSettings()]);
  // Personal details are shown only to the buyer (account or secret link) and authorised staff.
  const allowed =
    bundle && (tokenMatches(bundle.order.accessToken, t) || (user && (bundle.order.userId === user.id || can(user, "view_orders", "manage_orders"))));
  if (!bundle || !allowed) notFound();
  const { order, history } = bundle;

  return (
    <div className="container-page py-5 sm:py-8">
      <Breadcrumbs items={[{ label: "Order Confirmation" }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <span className="grid size-20 shrink-0 place-items-center rounded-full bg-brand-100">
              <span className="grid size-14 place-items-center rounded-full bg-brand-600 text-white">
                <Check className="size-8" strokeWidth={3} />
              </span>
            </span>
            <div>
              <h1 className="h-page">Order Placed Successfully</h1>
              <p className="mt-1 text-sm text-navy-700">Thank you for shopping with {settings.pharmacyName}, {order.customerName.split(" ")[0]}.</p>
              <p className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-lg font-bold text-navy-900">Order #{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
              </p>
              <p className="mt-1 text-xs text-navy-500">Placed on {formatDateTime(order.createdAt)}</p>
            </div>
          </section>

          {order.status !== "cancelled" && order.status !== "delivered" && (
            <p className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm font-semibold text-brand-800">
              <Truck className="size-5 shrink-0" /> {settings.deliveryMessage}
            </p>
          )}

          <section className="card p-5 sm:p-6" aria-labelledby="oc-track">
            <h2 id="oc-track" className="h-section mb-5">
              Order Status
            </h2>
            <OrderTimeline status={order.status} history={history} />
          </section>

          <section className="card p-5 sm:p-6" aria-label="Delivery and payment">
            <OrderParties bundle={bundle} />
          </section>

          <div className="no-print flex flex-wrap gap-3">
            <Link href="/products" className="btn btn-primary">
              Continue Shopping
            </Link>
            <Link href={`/track?order=${order.orderNumber}`} className="btn btn-outline">
              Track This Order
            </Link>
            {user && bundle.order.userId === user.id && (
              <Link href="/account/orders" className="btn btn-outline">
                My Orders
              </Link>
            )}
          </div>
        </div>

        <aside className="card self-start p-5 sm:p-6">
          <h2 className="h-section mb-2">Order Summary</h2>
          <OrderItemsTable bundle={bundle} currency={settings.currency} />
        </aside>
      </div>
    </div>
  );
}
