import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./db/schema";
import { can, isStaffRole, type Permission, type Role } from "./permissions";

const COOKIE = "mz_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  permissions: string[];
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters. See .env.example.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: { id: number; sessionVersion: number }) {
  const token = await new SignJWT({ v: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Verifies the cookie and re-reads the user, so deactivation and password changes take effect immediately. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let userId: number;
  let version: unknown;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    userId = Number(payload.sub);
    version = payload.v;
  } catch {
    return null;
  }
  if (!Number.isInteger(userId)) return null;
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.active || user.sessionVersion !== version) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as Role,
    permissions: user.permissions ?? [],
  };
});

/** Pages: signed-in customer or staff, otherwise redirect to login. */
export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Pages: staff holding at least one of the given permissions (any staff when none given). */
export async function requireStaffPage(...anyOf: Permission[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaffRole(user.role)) redirect("/");
  if (anyOf.length && !can(user, ...anyOf)) redirect("/admin?denied=1");
  return user;
}

export async function requireOwnerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "owner") redirect(isStaffRole(user.role) ? "/admin?denied=1" : "/");
  return user;
}

/** Server actions / route handlers: returns null instead of redirecting. */
export async function getStaff(...anyOf: Permission[]) {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return null;
  if (anyOf.length && !can(user, ...anyOf)) return null;
  return user;
}

export async function getOwner() {
  const user = await getCurrentUser();
  return user?.role === "owner" ? user : null;
}

export const DENIED = { ok: false as const, message: "You do not have permission to do this." };
