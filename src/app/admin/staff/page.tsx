import { asc, eq, notInArray } from "drizzle-orm";
import { StaffManager } from "@/components/admin/people-forms";
import { PageHeader } from "@/components/ui/misc";
import { requireOwnerPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Role } from "@/lib/permissions";

export const metadata = { title: "Staff" };

export default async function AdminStaffPage() {
  await requireOwnerPage();
  const db = await getDb();
  const [staff, [owner]] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, permissions: users.permissions, active: users.active, createdAt: users.createdAt })
      .from(users)
      .where(notInArray(users.role, ["customer", "owner"]))
      .orderBy(asc(users.name)),
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.role, "owner")).limit(1),
  ]);
  return (
    <>
      <PageHeader title="Staff" subtitle="Add staff, choose their role and control exactly what each person can do." />
      <StaffManager owner={owner ?? null} staff={staff.map((s) => ({ ...s, role: s.role as Role, createdAt: s.createdAt.toISOString() }))} />
    </>
  );
}
