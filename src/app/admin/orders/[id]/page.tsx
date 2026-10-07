import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderControls, PrescriptionControls } from "@/components/admin/order-controls";
import { PrintButton } from "@/components/admin/widgets";
import { OrderItemsTable, OrderParties, OrderTimeline } from "@/components/store/order-view";
import { Badge, OrderStatusBadge, PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import type { OrderStatus } from "@/lib/constants";
import { getOrderBundle } from "@/lib/orders";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Order Details" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage("view_orders", "manage_orders");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [bundle, settings] = await Promise.all([getOrderBundle({ id }), getSettings()]);
  if (!bundle) notFound();
  const { order, history } = bundle;
  const canVerify = can(user, "manage_requests");
  const canOpenFile = can(user, "manage_requests", "manage_orders");

  return (
    <>
      <Link href="/admin/orders" className="no-print mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="size-4" /> All Orders
      </Link>
      <PageHeader title={`Order #${order.orderNumber}`} subtitle={`Placed on ${formatDateTime(order.createdAt)}`}>
        <OrderStatusBadge status={order.status} />
        <PrintButton />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="h-section mb-5">Status</h2>
            <OrderTimeline status={order.status} history={history} />
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="h-section mb-2">Products</h2>
            <OrderItemsTable bundle={bundle} currency={settings.currency} />
          </section>
          <section className="card p-5 sm:p-6">
            <OrderParties bundle={bundle} />
          </section>
        </div>

        <div className="no-print space-y-6">
          {can(user, "manage_orders") ? (
            <OrderControls orderId={order.id} status={order.status as OrderStatus} paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} />
          ) : (
            <p className="card p-5 text-sm text-navy-500">You can view this order but not change it.</p>
          )}

          {order.prescriptionStatus !== "none" && (
            <section className="card p-5 sm:p-6" aria-labelledby="rx-title">
              <h2 id="rx-title" className="h-section mb-3 flex items-center gap-2">
                <FileText className="size-5 text-brand-600" /> Prescription
              </h2>
              <p className="mb-3 text-sm">
                Status:{" "}
                <Badge tone={order.prescriptionStatus === "approved" ? "green" : order.prescriptionStatus === "rejected" ? "red" : "amber"}>
                  {order.prescriptionStatus === "pending" ? "Awaiting verification" : order.prescriptionStatus === "approved" ? "Verified" : "Rejected"}
                </Badge>
              </p>
              {!canOpenFile ? null : order.prescriptionFileId ? (
                <a href={`/api/files/${order.prescriptionFileId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full">
                  <FileText className="size-4" /> View Prescription
                </a>
              ) : (
                <p className="text-sm text-navy-500">The prescription file is no longer available.</p>
              )}
              {canVerify ? (
                <PrescriptionControls orderId={order.id} current={order.prescriptionStatus} />
              ) : (
                <p className="mt-3 text-xs text-navy-500">Only a pharmacist (or the owner) can verify prescriptions.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
