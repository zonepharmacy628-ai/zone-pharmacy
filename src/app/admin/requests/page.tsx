import { desc, eq, sql } from "drizzle-orm";
import { ClipboardPlus } from "lucide-react";
import Link from "next/link";
import { RequestList } from "@/components/admin/people-forms";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, type RequestStatus } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { medicineRequests } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const metadata = { title: "Medicine Requests" };

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("manage_requests");
  const raw = (await searchParams).status;
  const status = REQUEST_STATUSES.includes(raw as RequestStatus) ? (raw as RequestStatus) : undefined;
  const db = await getDb();
  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(medicineRequests)
      .where(status ? eq(medicineRequests.status, status) : undefined)
      .orderBy(desc(medicineRequests.createdAt))
      .limit(200),
    db.select({ status: medicineRequests.status, n: sql<number>`count(*)::int` }).from(medicineRequests).groupBy(medicineRequests.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <>
      <PageHeader title="Medicine Requests" subtitle="Medicines customers could not find and asked you to source." />
      <ul className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        <li className="shrink-0">
          <Link href="/admin/requests" className={cn("btn btn-sm", !status ? "btn-primary" : "btn-outline")}>
            All
          </Link>
        </li>
        {REQUEST_STATUSES.map((s) => (
          <li key={s} className="shrink-0">
            <Link href={`/admin/requests?status=${s}`} className={cn("btn btn-sm", status === s ? "btn-primary" : "btn-outline")}>
              {REQUEST_STATUS_LABELS[s]} ({countOf(s)})
            </Link>
          </li>
        ))}
      </ul>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState icon={<ClipboardPlus />} title="No requests" text="Customer medicine requests will appear here." />
        ) : (
          <RequestList requests={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), userId: undefined }))} />
        )}
      </div>
    </>
  );
}
