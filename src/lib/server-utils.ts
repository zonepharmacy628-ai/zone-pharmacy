import "server-only";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb, type DB, type Tx } from "./db";
import { activityLogs, files, rateLimits } from "./db/schema";
import { MAX_UPLOAD_BYTES, type ActionResult } from "./constants";
import type { SessionUser } from "./auth";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Fixed-window limiter stored in the database so it also works across serverless instances. */
export async function rateLimit(action: string, max: number, windowSeconds: number, subject?: string) {
  const db = await getDb();
  const key = `${action}:${subject ?? (await clientIp())}`.slice(0, 200);
  const resetAt = new Date(Date.now() + windowSeconds * 1000);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} < now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} < now() then excluded.reset_at else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= max;
}

export const TOO_MANY = { ok: false as const, message: "Too many attempts. Please wait a few minutes and try again." };

export async function logActivity(user: Pick<SessionUser, "id" | "name">, action: string, details = "", tx?: DB | Tx) {
  const db = tx ?? (await getDb());
  await db.insert(activityLogs).values({ userId: user.id, userName: user.name, action, details: details.slice(0, 500) });
}

/** Turns a failed zod parse into the ActionResult error shape. */
export function invalid(error: z.ZodError): ActionResult<never> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  return { ok: false, message: "Please fix the highlighted fields.", errors };
}

export function formObject(fd: FormData) {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") obj[k] = v;
  return obj;
}

type UploadKind = "product" | "branding" | "prescription";

const ALLOWED: Record<UploadKind, string[]> = {
  product: ["image/jpeg", "image/png", "image/webp"],
  branding: ["image/jpeg", "image/png", "image/webp", "image/x-icon"],
  prescription: ["image/jpeg", "image/png", "application/pdf"],
};

/** Detects the real type from magic bytes; the browser-supplied MIME type is never trusted. */
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return "image/x-icon";
  return null;
}

export function hasUpload(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && value.size > 0;
}

/** Validates and stores an upload. Returns the file id, or an error message. */
export async function saveUpload(
  file: File,
  kind: UploadKind,
  ownerId: number | null,
  tx?: DB | Tx,
): Promise<{ id: string } | { error: string }> {
  if (file.size > MAX_UPLOAD_BYTES) return { error: "File is too large. Maximum size is 4 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const mime = sniff(data);
  if (!mime || !ALLOWED[kind].includes(mime)) {
    return {
      error: kind === "prescription" ? "Only PDF, JPG or PNG files are allowed." : "Only JPG, PNG or WebP images are allowed.",
    };
  }
  const db = tx ?? (await getDb());
  const [row] = await db.insert(files).values({ kind, mime, size: data.length, data, ownerId }).returning({ id: files.id });
  return { id: row.id };
}

export async function deleteFile(id: string | null | undefined, tx?: DB | Tx) {
  if (!id) return;
  const db = tx ?? (await getDb());
  await db.delete(files).where(eq(files.id, id));
}
