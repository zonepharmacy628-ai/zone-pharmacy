import { PackageSearch, Search } from "lucide-react";
import type { Metadata } from "next";
import { OrderTimeline } from "@/components/store/order-view";
import { Breadcrumbs } from "@/components/store/sections";
import { OrderStatusBadge } from "@/components/ui/misc";
import { getOrderBundle } from "@/lib/orders";
import { rateLimit } from "@/lib/server-utils";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Enter your order number to see the latest status of your 24Zone Pharmacy order.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const raw = (await searchParams).order?.trim().replace(/^#/, "").toUpperCase().slice(0, 20);
  const valid = raw && /^(24Z|MZ)[A-Z0-9]{6,12}$/.test(raw);
  let limited = false;
  let bundle = null;
  if (valid) {
    limited = !(await rateLimit("track", 30, 600));
    if (!limited) bundle = await getOrderBundle({ orderNumber: raw });
  }
  const settings = await getSettings();

  return (
    <div className="container-page max-w-4xl py-5 sm:py-8">
      <Breadcrumbs items={[{ label: "Track Order" }]} />
      <section className="card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
            <PackageSearch className="size-7" />
          </span>
          <div>
            <h1 className="h-page">Track Your Order</h1>
            <p className="mt-1 text-sm text-navy-500">Enter the order number from your confirmation page.</p>
          </div>
        </div>
        <form action="/track" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="track-order" className="sr-only">
            Order number
          </label>
          <input id="track-order" name="order" required maxLength={20} defaultValue={raw ?? ""} placeholder="e.g. 24Z7K3F9Q2X" autoComplete="off" className="input flex-1 py-3 uppercase placeholder:normal-case" />
          <button type="submit" className="btn btn-primary px-6 py-3">
            <Search className="size-4" /> Track Order
          </button>
        </form>
      </section>

      {raw && (
        <section className="card mt-6 p-6 sm:p-8" aria-live="polite">
          {limited ? (
            <p className="text-center text-sm font-medium text-red-700">Too many lookups. Please wait a few minutes and try again.</p>
          ) : !bundle ? (
            <div className="text-center">
              <p className="text-lg font-bold text-navy-900">Order not found</p>
              <p className="mt-1 text-sm text-navy-500">We couldn&apos;t find an order with number “{raw}”. Please check the number and try again.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-navy-900">Order #{bundle.order.orderNumber}</h2>
                  <p className="text-sm text-navy-500">
                    Placed on {formatDate(bundle.order.createdAt)} · {bundle.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                  </p>
                </div>
                <OrderStatusBadge status={bundle.order.status} />
              </div>
              <OrderTimeline status={bundle.order.status} history={bundle.history} />
              {!["cancelled", "delivered"].includes(bundle.order.status) && (
                <p className="mt-6 rounded-xl bg-brand-50 p-4 text-sm font-medium text-brand-800">{settings.deliveryMessage}</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
