import { z } from "zod";

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ").trim();

/** Trimmed single-line text with control characters stripped. */
export const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required` })
    .transform(clean)
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .min(min, `${label} must be at least ${min} characters`)
        .max(max, `${label} must be at most ${max} characters`),
    );

export const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((s) => (s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim())
    .pipe(z.string().max(max, `Must be at most ${max} characters`));

export const nameSchema = text("Name", 2, 80);
export const emailSchema = z
  .string({ error: "Email is required" })
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.email("Enter a valid email address").max(160));
export const phoneSchema = z
  .string({ error: "Mobile number is required" })
  .transform((s) => s.trim())
  .pipe(z.string().regex(/^\+?[0-9][0-9\s-]{8,16}$/, "Enter a valid mobile number, e.g. 0300 1234567"));
export const optionalPhone = z
  .string()
  .optional()
  .transform((s) => (s ?? "").trim())
  .pipe(z.string().regex(/^(\+?[0-9][0-9\s-]{6,16})?$/, "Enter a valid phone number"));
export const optionalEmail = z
  .string()
  .optional()
  .transform((s) => (s ?? "").trim().toLowerCase())
  .pipe(z.union([z.literal(""), z.email("Enter a valid email address").max(160)]));
export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long");

const numeric = z.union([z.string(), z.number()], { error: "This field is required" });

/** Required numeric form field. An empty input is "required", never silently 0. */
function requiredNumber(label: string, min: number, max: number, integer: boolean) {
  return numeric.transform((v, ctx) => {
    const raw = typeof v === "string" ? v.trim() : v;
    const n = raw === "" ? Number.NaN : Number(raw);
    let message: string | null = null;
    if (raw === "") message = `${label} is required`;
    else if (!Number.isFinite(n)) message = `${label} must be a number`;
    else if (integer && !Number.isInteger(n)) message = `${label} must be a whole number`;
    else if (n < min) message = min === 0 ? `${label} cannot be negative` : `${label} must be at least ${min}`;
    else if (n > max) message = `${label} is too large`;
    if (message) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return integer ? n : Math.round(n * 100) / 100;
  });
}

export const idSchema = requiredNumber("Selection", 1, 2_147_483_647, true);
export const requiredId = (label: string) =>
  numeric.transform((v, ctx) => {
    const n = Number(v);
    if (v === "" || !Number.isInteger(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: `Select a ${label}` });
      return z.NEVER;
    }
    return n;
  });
export const moneySchema = (label: string) => requiredNumber(label, 0, 10_000_000, false);
export const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });
export const intSchema = (label: string, min = 0, max = 1_000_000) => requiredNumber(label, min, max, true);
/** Unticked checkboxes are simply absent from FormData, so the key must be optional. */
export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
export const optionalDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!dateSchema.safeParse(v).success) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    return v;
  });

/** Hidden "id" inputs: empty or missing means "create new". */
export const optionalId = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Invalid reference" });
      return z.NEVER;
    }
    return n;
  });

export const optionalInt = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `Enter a whole number between ${min} and ${max}` });
        return z.NEVER;
      }
      return n;
    });

export const optionalPassword = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    if (v.length < 8 || v.length > 100) {
      ctx.addIssue({ code: "custom", message: "Password must be at least 8 characters" });
      return z.NEVER;
    }
    return v;
  });
