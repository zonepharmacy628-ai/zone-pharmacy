import { eq, inArray, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { medicineRequests, orders } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | 24Zone Pharmacy Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  const db = await getDb();
  const count = sql<number>`count(*)::int`;
  const [settings, [pending], [open]] = await Promise.all([
    getSettings(),
    db.select({ n: count }).from(orders).where(eq(orders.status, "pending")),
    db.select({ n: count }).from(medicineRequests).where(inArray(medicineRequests.status, ["new", "in_review"])),
  ]);
  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role, permissions: user.permissions }}
      pharmacyName={settings.pharmacyName}
      logoFileId={settings.logoFileId}
      badges={{ orders: pending.n, requests: open.n }}
    >
      {children}
    </AdminShell>
  );
}
