import { Ban, Check, ClipboardCheck, Home, MapPin, Package, Truck, Wallet } from "lucide-react";
import { PaymentStatusBadge } from "@/components/ui/misc";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderStatus, type PaymentMethod } from "@/lib/constants";
import type { OrderBundle } from "@/lib/orders";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

const STEPS: { status: OrderStatus; icon: typeof Check }[] = [
  { status: "pending", icon: ClipboardCheck },
  { status: "confirmed", icon: Check },
  { status: "processing", icon: Package },
  { status: "shipped", icon: Truck },
  { status: "delivered", icon: Home },
];

export function OrderTimeline({ status, history }: { status: string; history: { status: string; createdAt: Date }[] }) {
  const at = new Map(history.map((h) => [h.status, h.createdAt]));
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        <Ban className="size-6 shrink-0" />
        <div>
          <p className="font-bold">Order Cancelled</p>
          <p className="text-sm">{at.get("cancelled") ? `Cancelled on ${formatDateTime(at.get("cancelled")!)}` : "This order was cancelled."}</p>
        </div>
      </div>
    );
  }
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="flex flex-col gap-0 sm:flex-row">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const when = at.get(step.status);
        return (
          <li key={step.status} className="relative flex flex-1 gap-4 pb-6 last:pb-0 sm:flex-col sm:gap-3 sm:pb-0" aria-current={i === current ? "step" : undefined}>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-10 left-5 h-[calc(100%-2.5rem)] w-0.5 -translate-x-1/2 sm:top-5 sm:left-10 sm:h-0.5 sm:w-[calc(100%-2.5rem)] sm:translate-x-0 sm:-translate-y-1/2",
                  i < current ? "bg-brand-600" : "bg-line",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2",
                i === current ? "border-brand-600 bg-brand-600 text-white ring-4 ring-brand-100" : done ? "border-brand-600 bg-white text-brand-600" : "border-line bg-white text-navy-400",
              )}
            >
              <step.icon className="size-5" />
            </span>
            <div className="pt-1 sm:pt-0">
              <p className={cn("text-sm font-bold", done ? "text-navy-900" : "text-navy-400")}>{ORDER_STATUS_LABELS[step.status]}</p>
              <p className="text-xs text-navy-500">{when ? formatDateTime(when) : done ? "" : "Not yet"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItemsTable({ bundle, currency }: { bundle: OrderBundle; currency: string }) {
  const { order, items } = bundle;
  return (
    <div>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-navy-900">{item.name}</p>
              <p className="text-xs text-navy-500">
                Qty: {item.quantity} × {formatMoney(item.price, currency)}
              </p>
            </div>
            <p className="font-bold whitespace-nowrap">{formatMoney(item.price * item.quantity, currency)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-navy-700">Subtotal</dt>
          <dd className="font-semibold">{formatMoney(order.subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-navy-700">Delivery Charges</dt>
          <dd className="font-semibold">{order.deliveryCharge === 0 ? "Free" : formatMoney(order.deliveryCharge, currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-base font-bold text-navy-900">Total</dt>
          <dd className="text-xl font-extrabold text-brand-700">{formatMoney(order.total, currency)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function OrderParties({ bundle }: { bundle: OrderBundle }) {
  const { order } = bundle;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-line p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-navy-900">
          <MapPin className="size-4 text-brand-600" /> Delivery Address
        </p>
        <p className="text-sm font-semibold text-navy-900">{order.customerName}</p>
        <p className="text-sm text-navy-700">
          {order.address}, {order.city}
        </p>
        <p className="text-sm text-navy-700">{order.phone}</p>
        <p className="text-sm break-all text-navy-700">{order.email}</p>
        {order.notes && <p className="mt-2 text-xs text-navy-500">Note: {order.notes}</p>}
      </div>
      <div className="rounded-2xl border border-line p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-navy-900">
          <Wallet className="size-4 text-brand-600" /> Payment
        </p>
        <p className="text-sm font-semibold text-navy-900">{PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}</p>
        {order.paymentReference && <p className="text-sm break-all text-navy-700">Transaction ID: {order.paymentReference}</p>}
        <div className="mt-2">
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
        {order.prescriptionStatus !== "none" && (
          <p className="mt-3 text-xs text-navy-500">
            Prescription:{" "}
            <span className="font-semibold text-navy-900">
              {order.prescriptionStatus === "pending" ? "Awaiting pharmacist verification" : order.prescriptionStatus === "approved" ? "Verified" : "Rejected"}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
