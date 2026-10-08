import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { ORDER_STATUS_LABELS, REQUEST_STATUS_LABELS, type OrderStatus, type RequestStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-brand-100 text-brand-600 [&>svg]:size-7">{icon}</div>
      <h3 className="text-lg font-bold text-navy-900">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-navy-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const TONES = {
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-sky-50 text-sky-700",
  purple: "bg-brand-100 text-brand-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-slate-100 text-slate-600",
};

export function Badge({ tone = "purple", children, className }: { tone?: keyof typeof TONES; children: React.ReactNode; className?: string }) {
  return <span className={cn("badge", TONES[tone], className)}>{children}</span>;
}

const ORDER_TONES: Record<OrderStatus, keyof typeof TONES> = {
  pending: "amber",
  confirmed: "blue",
  processing: "blue",
  shipped: "purple",
  delivered: "green",
  cancelled: "red",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  return <Badge tone={ORDER_TONES[s] ?? "gray"}>{ORDER_STATUS_LABELS[s] ?? status}</Badge>;
}

const REQUEST_TONES: Record<RequestStatus, keyof typeof TONES> = {
  new: "amber",
  in_review: "blue",
  available: "green",
  unavailable: "red",
  closed: "gray",
};

export function RequestStatusBadge({ status }: { status: string }) {
  const s = status as RequestStatus;
  return <Badge tone={REQUEST_TONES[s] ?? "gray"}>{REQUEST_STATUS_LABELS[s] ?? status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return status === "paid" ? (
    <Badge tone="green">Paid</Badge>
  ) : status === "pending" ? (
    <Badge tone="amber">Awaiting verification</Badge>
  ) : (
    <Badge tone="gray">Unpaid</Badge>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
      ))}
    </span>
  );
}

/** Link-based pagination; `hrefFor` builds the URL for a page number. */
export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="btn btn-outline btn-sm" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-navy-400">…</span>}
          <Link
            href={hrefFor(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn("btn btn-sm min-w-10", n === page ? "btn-primary" : "btn-outline")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={hrefFor(page + 1)} className="btn btn-outline btn-sm" aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="h-page">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {children && <div className="no-print flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
