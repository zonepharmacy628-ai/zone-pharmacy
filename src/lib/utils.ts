import { EXPIRING_SOON_DAYS } from "./constants";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency = "Rs.") {
  const hasFraction = Math.round(amount * 100) % 100 !== 0;
  return `${currency} ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const PK_TZ = "Asia/Karachi";

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T00:00:00+05:00` : d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: PK_TZ });
}

export function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: PK_TZ,
  });
}

/** Today's date (YYYY-MM-DD) in Pakistan time. */
export function todayPk(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: PK_TZ }).format(now);
}

/** Start of a Pakistan-time calendar day as a UTC Date. */
export function pkDayStart(ymd: string) {
  return new Date(`${ymd}T00:00:00+05:00`);
}

export function discountPercent(price: number, comparePrice: number | null | undefined) {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export type ExpiryStatus = "valid" | "expiring" | "expired" | "none";

export function expiryStatus(expiry: string | null | undefined): ExpiryStatus {
  if (!expiry) return "none";
  const today = todayPk();
  if (expiry < today) return "expired";
  if (expiry <= todayPk(EXPIRING_SOON_DAYS)) return "expiring";
  return "valid";
}

export function fileUrl(id: string | null | undefined) {
  return id ? `/api/files/${id}` : null;
}

export function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
