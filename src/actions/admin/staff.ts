"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DENIED, getOwner } from "@/lib/auth";
import type { ActionResult } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ALL_PERMISSIONS, ROLE_LABELS, STAFF_ROLES, type Permission, type StaffRole } from "@/lib/permissions";
import { formObject, invalid, logActivity } from "@/lib/server-utils";
import { checkbox, emailSchema, nameSchema, optionalId, optionalPassword, optionalPhone } from "@/lib/validators";

const staffSchema = z.object({
  id: optionalId,
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhone,
  password: optionalPassword,
  role: z.enum(Object.keys(STAFF_ROLES) as [StaffRole, ...StaffRole[]], { error: "Choose a role" }),
  active: checkbox,
});

/** Owner only. Staff are never given the owner role and the owner account cannot be edited here. */
export async function saveStaffAction(fd: FormData): Promise<ActionResult> {
  const owner = await getOwner();
  if (!owner) return DENIED;
  const parsed = staffSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, password, ...data } = parsed.data;
  const permissions = fd
    .getAll("permissions")
    .map(String)
    .filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(p));
  const db = await getDb();

  const [dupe] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, data.email), id ? ne(users.id, id) : undefined));
  if (dupe) return { ok: false, message: "This email is already in use.", errors: { email: "Email already in use" } };

  if (id) {
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target || target.role === "owner" || target.role === "customer") return { ok: false, message: "Staff member not found." };
    // Password change or deactivation invalidates that person's existing sessions.
    const invalidate = Boolean(password) || (target.active && !data.active);
    await db
      .update(users)
      .set({
        ...data,
        permissions,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        ...(invalidate ? { sessionVersion: sql`${users.sessionVersion} + 1` } : {}),
      })
      .where(eq(users.id, id));
    await logActivity(owner, "Staff updated", `${data.name} (${ROLE_LABELS[data.role]})${data.active ? "" : " — deactivated"}`);
  } else {
    if (!password) return { ok: false, message: "Set a password for the new staff member.", errors: { password: "Password is required" } };
    await db.insert(users).values({ ...data, permissions, passwordHash: await bcrypt.hash(password, 10) });
    await logActivity(owner, "Staff added", `${data.name} (${ROLE_LABELS[data.role]})`);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Staff member updated." : "Staff member added." };
}

export async function setStaffActiveAction(id: number, active: boolean): Promise<ActionResult> {
  const owner = await getOwner();
  if (!owner) return DENIED;
  const db = await getDb();
  const [target] = await db.select().from(users).where(eq(users.id, Number(id)));
  if (!target || target.role === "owner" || target.role === "customer") return { ok: false, message: "Staff member not found." };
  await db
    .update(users)
    .set({ active: Boolean(active), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, target.id));
  await logActivity(owner, active ? "Staff reactivated" : "Staff deactivated", target.name);
  revalidatePath("/", "layout");
  return { ok: true, message: active ? "Staff member reactivated." : "Staff member deactivated." };
}
