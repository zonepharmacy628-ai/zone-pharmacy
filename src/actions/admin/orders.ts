"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DENIED, getStaff } from "@/lib/auth";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  type ActionResult,
  type OrderStatus,
  type RequestStatus,
} from "@/lib/constants";
import { getDb } from "@/lib/db";
import { medicineRequests, orderItems, orderStatusHistory, orders, products, stockMovements } from "@/lib/db/schema";
import { logActivity } from "@/lib/server-utils";

export async function updateOrderStatusAction(orderId: number, status: OrderStatus): Promise<ActionResult> {
  const staff = await getStaff("manage_orders");
  if (!staff) return DENIED;
  if (!ORDER_STATUSES.includes(status)) return { ok: false, message: "Unknown status." };
  const db = await getDb();
  const error = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, Number(orderId))).for("update");
    if (!order) return "Order not found.";
    if (order.status === status) return null;
    if (order.status === "cancelled") return "A cancelled order cannot be reopened.";
    if (order.status === "delivered") return "A delivered order can no longer be changed.";
    if (status !== "cancelled" && order.prescriptionStatus === "rejected") {
      return "The prescription for this order was rejected. It can only be cancelled.";
    }
    if (["shipped", "delivered"].includes(status) && order.prescriptionStatus === "pending") {
      return "Verify the prescription before shipping this order.";
    }

    if (status === "cancelled") {
      // Return every item to stock exactly once; the row lock above prevents double restores.
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        if (item.productId === null) continue;
        const [updated] = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} + ${item.quantity}`,
            soldCount: sql`greatest(${products.soldCount} - ${item.quantity}, 0)`,
          })
          .where(eq(products.id, item.productId))
          .returning({ stock: products.stock });
        if (updated) {
          await tx.insert(stockMovements).values({
            productId: item.productId,
            change: item.quantity,
            balanceAfter: updated.stock,
            reason: "cancellation",
            reference: order.orderNumber,
            userId: staff.id,
          });
        }
      }
    }

    await tx
      .update(orders)
      .set({
        status,
        ...(status === "delivered" && order.paymentMethod === "cod" ? { paymentStatus: "paid" } : {}),
      })
      .where(eq(orders.id, order.id));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, status, byUserId: staff.id });
    await logActivity(staff, "Order status changed", `${order.orderNumber}: ${ORDER_STATUS_LABELS[order.status as OrderStatus]} → ${ORDER_STATUS_LABELS[status]}`, tx);
    return null;
  });
  if (error) return { ok: false, message: error };
  revalidatePath("/", "layout");
  return { ok: true, message: `Order marked as ${ORDER_STATUS_LABELS[status]}.` };
}

export async function setPaymentStatusAction(orderId: number, paymentStatus: "unpaid" | "pending" | "paid"): Promise<ActionResult> {
  const staff = await getStaff("manage_orders");
  if (!staff) return DENIED;
  if (!["unpaid", "pending", "paid"].includes(paymentStatus)) return { ok: false, message: "Unknown payment status." };
  const db = await getDb();
  const [row] = await db
    .update(orders)
    .set({ paymentStatus })
    .where(eq(orders.id, Number(orderId)))
    .returning({ orderNumber: orders.orderNumber });
  if (!row) return { ok: false, message: "Order not found." };
  await logActivity(staff, "Payment status changed", `${row.orderNumber}: ${paymentStatus}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Payment status updated." };
}

export async function setPrescriptionStatusAction(orderId: number, decision: "approved" | "rejected"): Promise<ActionResult> {
  const staff = await getStaff("manage_requests");
  if (!staff) return DENIED;
  if (!["approved", "rejected"].includes(decision)) return { ok: false, message: "Unknown decision." };
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, Number(orderId)));
  if (!order) return { ok: false, message: "Order not found." };
  if (order.prescriptionStatus === "none") return { ok: false, message: "This order has no prescription." };
  await db.update(orders).set({ prescriptionStatus: decision }).where(eq(orders.id, order.id));
  await logActivity(staff, `Prescription ${decision}`, order.orderNumber);
  revalidatePath("/", "layout");
  return { ok: true, message: `Prescription ${decision}.` };
}

export async function updateMedicineRequestAction(fd: FormData): Promise<ActionResult> {
  const staff = await getStaff("manage_requests");
  if (!staff) return DENIED;
  const id = Number(fd.get("id"));
  const status = String(fd.get("status")) as RequestStatus;
  const adminNote = String(fd.get("adminNote") ?? "").trim().slice(0, 1000);
  if (!REQUEST_STATUSES.includes(status)) return { ok: false, message: "Unknown status." };
  const db = await getDb();
  const [row] = await db
    .update(medicineRequests)
    .set({ status, adminNote })
    .where(eq(medicineRequests.id, id))
    .returning({ medicineName: medicineRequests.medicineName });
  if (!row) return { ok: false, message: "Request not found." };
  await logActivity(staff, "Medicine request updated", `${row.medicineName}: ${REQUEST_STATUS_LABELS[status]}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Request updated." };
}
