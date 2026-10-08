"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DENIED, getOwner, getStaff } from "@/lib/auth";
import type { ActionResult } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ALL_PERMISSIONS, ROLE_LABELS, STAFF_ROLES, type Permission, type StaffRole } from "@/lib/permissions";
import { formObject, invalid, logActivity, rateLimit, TOO_MANY } from "@/lib/server-utils";
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

const myProfileSchema = z.object({ name: nameSchema, phone: optionalPhone });

/** Any signed-in staff member (owner included) may edit their own name and phone. Role and permissions are never touched here. */
export async function updateMyProfileAction(fd: FormData): Promise<ActionResult> {
  const me = await getStaff();
  if (!me) return DENIED;
  const parsed = myProfileSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const db = await getDb();
  await db.update(users).set(parsed.data).where(eq(users.id, me.id));
  await logActivity({ id: me.id, name: parsed.data.name }, "Profile updated", me.name === parsed.data.name ? "" : `Name changed from ${me.name}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated." };
}

const ownerEmailSchema = z.object({ email: emailSchema, currentPassword: z.string().min(1, "Enter your current password").max(200) });

/** Owner only: change the owner's own login email, confirmed with the current password. */
export async function changeOwnerEmailAction(fd: FormData): Promise<ActionResult> {
  const owner = await getOwner();
  if (!owner) return DENIED;
  if (!(await rateLimit("owner-email", 6, 900, String(owner.id)))) return TOO_MANY;
  const parsed = ownerEmailSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { email, currentPassword } = parsed.data;
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, owner.id));
  if (!row || !(await bcrypt.compare(currentPassword, row.passwordHash))) {
    return { ok: false, message: "Current password is incorrect.", errors: { currentPassword: "Incorrect password" } };
  }
  if (email === row.email) return { ok: false, message: "This is already your login email.", errors: { email: "No change" } };
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, owner.id)));
  if (taken) return { ok: false, message: "This email is already in use.", errors: { email: "Email already in use" } };
  await db.update(users).set({ email }).where(eq(users.id, owner.id));
  await logActivity(owner, "Owner login email changed", `${row.email} → ${email}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Login email updated. Use the new email next time you sign in." };
}
