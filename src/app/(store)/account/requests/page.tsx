import { desc, eq } from "drizzle-orm";
import { ClipboardPlus, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState, RequestStatusBadge } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { medicineRequests } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";

export default async function AccountRequestsPage() {
  const user = await requireUser("/account/requests");
  const db = await getDb();
  const rows = await db.select().from(medicineRequests).where(eq(medicineRequests.userId, user.id)).orderBy(desc(medicineRequests.createdAt)).limit(100);
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h-page">Medicine Requests</h1>
          <p className="mt-1 text-sm text-navy-500">Medicines you asked us to source for you.</p>
        </div>
        <Link href="/medicine-request" className="btn btn-primary">
          <Plus className="size-4" /> New Request
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardPlus />} title="No requests yet" text="Can't find a medicine? Request it and our pharmacist will get back to you." />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-navy-900">
                  {r.medicineName} {r.quantity ? <span className="font-normal text-navy-500">× {r.quantity}</span> : null}
                </p>
                <RequestStatusBadge status={r.status} />
              </div>
              <p className="text-xs text-navy-500">Requested on {formatDate(r.createdAt)}</p>
              {r.message && <p className="mt-1 text-sm text-navy-700">{r.message}</p>}
              {r.adminNote && <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-navy-800">Pharmacist: {r.adminNote}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
