import { Package } from "lucide-react";
import Link from "next/link";
import { EmptyState, OrderStatusBadge } from "@/components/ui/misc";
import { formatDate, formatMoney } from "@/lib/utils";
import { ReorderButton } from "./forms";

type Row = { id: number; orderNumber: string; createdAt: Date; total: number; status: string };

export function OrdersTable({ orders, currency }: { orders: Row[]; currency: string }) {
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
    <div className="table-wrap">
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
              <td className="whitespace-nowrap text-navy-700">{formatDate(o.createdAt)}</td>
              <td className="font-semibold whitespace-nowrap">{formatMoney(o.total, currency)}</td>
              <td>
                <OrderStatusBadge status={o.status} />
              </td>
              <td>
                <div className="flex gap-2">
                  <Link href={`/account/orders/${o.orderNumber}`} className="btn btn-outline btn-sm">
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
  );
}
