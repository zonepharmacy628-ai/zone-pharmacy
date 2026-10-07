"use client";

import { Ban, Check, X } from "lucide-react";
import { setPaymentStatusAction, setPrescriptionStatusAction, updateOrderStatusAction } from "@/actions/admin/orders";
import { ActionButton } from "@/components/ui/form";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function OrderControls({
  orderId,
  status,
  paymentStatus,
  paymentMethod,
}: {
  orderId: number;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
}) {
  const closed = status === "cancelled" || status === "delivered";
  const flow = ORDER_STATUSES.filter((s) => s !== "cancelled");
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="order-controls">
      <h2 id="order-controls" className="h-section mb-3">
        Update Status
      </h2>
      {closed ? (
        <p className="text-sm text-navy-500">This order is {ORDER_STATUS_LABELS[status].toLowerCase()} and can no longer be changed.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {flow.map((s) => (
              <ActionButton
                key={s}
                action={() => updateOrderStatusAction(orderId, s)}
                disabled={s === status}
                className={cn("btn btn-sm", s === status ? "btn-primary" : "btn-outline")}
              >
                {ORDER_STATUS_LABELS[s]}
              </ActionButton>
            ))}
          </div>
          <ActionButton
            action={() => updateOrderStatusAction(orderId, "cancelled")}
            confirm="Cancel this order? The items will be returned to stock. This cannot be undone."
            className="btn btn-danger btn-sm mt-3 w-full"
          >
            <Ban className="size-4" /> Cancel Order
          </ActionButton>
        </>
      )}

      <h3 className="mt-6 mb-2 text-sm font-bold text-navy-900">Payment</h3>
      <div className="grid grid-cols-3 gap-2">
        {(["unpaid", "pending", "paid"] as const).map((p) => (
          <ActionButton
            key={p}
            action={() => setPaymentStatusAction(orderId, p)}
            disabled={p === paymentStatus}
            className={cn("btn btn-sm", p === paymentStatus ? "btn-primary" : "btn-outline")}
          >
            {p === "pending" ? "Verifying" : p === "paid" ? "Paid" : "Unpaid"}
          </ActionButton>
        ))}
      </div>
      {paymentMethod !== "cod" && paymentStatus !== "paid" && (
        <p className="mt-2 text-xs text-navy-500">Check the transaction ID against your account statement, then mark the order as Paid.</p>
      )}
    </section>
  );
}

export function PrescriptionControls({ orderId, current }: { orderId: number; current: string }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <ActionButton action={() => setPrescriptionStatusAction(orderId, "approved")} disabled={current === "approved"} className="btn btn-primary btn-sm">
        <Check className="size-4" /> Approve
      </ActionButton>
      <ActionButton
        action={() => setPrescriptionStatusAction(orderId, "rejected")}
        disabled={current === "rejected"}
        confirm="Reject this prescription? The order can then only be cancelled."
        className="btn btn-danger btn-sm"
      >
        <X className="size-4" /> Reject
      </ActionButton>
    </div>
  );
}
