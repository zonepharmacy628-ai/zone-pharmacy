import { Package } from "lucide-react";
import Link from "next/link";
import { EmptyState, OrderStatusBadge } from "@/components/ui/misc";
import { formatDate, formatMoney } from "@/lib/utils";
import { ReorderButton } from "./forms";

type Row = {
  id: number;
  orderNumber: string;
  createdAt: Date;
  total: number;
  status: string;
};

export function OrdersTable({
  orders,
  currency,
}: {
  orders: Row[];
  currency: string;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package />}
        title="No orders yet"
        text="When you place an order it will appear here."
        action={
          <Link href="/products" className="btn btn-primary">
            Start Shopping
          </Link>
        }
      />
    );
  }
  return (
    <>
      {/* Phones and tablets: one card per order, so nothing scrolls sideways. */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:hidden">
        {orders.map((o) => (
          <li key={o.id} className="rounded-2xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-navy-900">#{o.orderNumber}</p>
                <p className="text-xs text-navy-500">
                  {formatDate(o.createdAt)}
                </p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
            <p className="mt-2 text-sm text-navy-700">
              Total:{" "}
              <span className="font-bold text-navy-900">
                {formatMoney(o.total, currency)}
              </span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/account/orders/${o.orderNumber}`}
                className="btn btn-outline btn-sm"
              >
                View
              </Link>
              <ReorderButton orderNumber={o.orderNumber} />
            </div>
          </li>
        ))}
      </ul>
      <div className="table-wrap hidden xl:block">
        <table className="table-base">
          <thead>
            <tr>
              <th>Order No.</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-bold text-navy-900">#{o.orderNumber}</td>
                <td className="whitespace-nowrap text-navy-700">
                  {formatDate(o.createdAt)}
                </td>
                <td className="font-semibold whitespace-nowrap">
                  {formatMoney(o.total, currency)}
                </td>
                <td>
                  <OrderStatusBadge status={o.status} />
                </td>
                <td>
                  <div className="flex gap-2">
                    <Link
                      href={`/account/orders/${o.orderNumber}`}
                      className="btn btn-outline btn-sm"
                    >
                      View
                    </Link>
                    <ReorderButton orderNumber={o.orderNumber} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
