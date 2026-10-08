"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isStaffRole } from "@/lib/permissions";
import { formObject, invalid, logActivity, rateLimit, TOO_MANY } from "@/lib/server-utils";
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from "@/lib/validators";

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

/** Only same-site relative paths are accepted as post-login destinations. */
function safeNext(next: string | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

export async function registerAction(fd: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  if (!(await rateLimit("register", 8, 3600))) return TOO_MANY;
  const parsed = registerSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, phone, password } = parsed.data;
  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) return { ok: false, message: "An account with this email already exists.", errors: { email: "Email already registered" } };
  const [user] = await db
    .insert(users)
    .values({ name, email, phone, passwordHash: await bcrypt.hash(password, 10), role: "customer" })
    .returning({ id: users.id, sessionVersion: users.sessionVersion });
  await createSession(user);
  revalidatePath("/", "layout");
  return { ok: true, message: "Welcome to 24Zone Pharmacy!", data: { redirectTo: safeNext(fd.get("next")?.toString(), "/account") } };
}

let dummyHash: string | undefined;

const loginSchema =z.object({ email: emailSchema, password: z.string().min(1, "Password is required").max(200) });

export async function loginAction(fd: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password } = parsed.data;
  if (!(await rateLimit("login", 10, 900)) || !(await rateLimit("login-email", 8, 900, email))) return TOO_MANY;
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Always run a hash comparison so response time does not reveal whether the email exists.
  dummyHash ??= await bcrypt.hash("medizone-timing-pad", 10);
  const matches = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !matches) return { ok: false, message: "Incorrect email or password." };
  if (!user.active) return { ok: false, message: "This account has been deactivated. Please contact the pharmacy." };
  await createSession(user);
  revalidatePath("/", "layout");
  const fallback = isStaffRole(user.role) ? "/admin" : "/account";
  return { ok: true, message: `Welcome back, ${user.name.split(" ")[0]}!`, data: { redirectTo: safeNext(fd.get("next")?.toString(), fallback) } };
}

export async function logoutAction() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

const passwordChangeSchema = z.object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: passwordSchema });

export async function changePasswordAction(fd: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: "Please sign in again." };
  if (!(await rateLimit("password", 6, 900, String(me.id)))) return TOO_MANY;
  const parsed = passwordChangeSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, me.id));
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { ok: false, message: "Current password is incorrect.", errors: { currentPassword: "Incorrect password" } };
  }
  // Bumping sessionVersion signs out every other device.
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.newPassword, 10), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, me.id))
    .returning({ id: users.id, sessionVersion: users.sessionVersion });
  await createSession(updated);
  if (isStaffRole(me.role)) await logActivity(me, "Password changed");
  return { ok: true, message: "Password updated." };
}
