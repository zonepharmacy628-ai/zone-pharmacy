import { desc, sql } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { requireOwnerPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Activity Log" };
const PER_PAGE = 50;

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireOwnerPage();
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const db = await getDb();
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(activityLogs),
  ]);
  return (
    <>
      <PageHeader title="Staff Activity Log" subtitle="Every important change made in the admin panel, and who made it." />
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState icon={<ScrollText />} title="No activity yet" text="Purchases, stock updates, product and order changes will be recorded here." />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Staff Member</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="text-xs whitespace-nowrap text-navy-700">{formatDateTime(a.createdAt)}</td>
                    <td className="font-medium">{a.userName}</td>
                    <td className="font-semibold whitespace-nowrap text-navy-900">{a.action}</td>
                    <td className="text-navy-700">{a.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} hrefFor={(p) => (p > 1 ? `/admin/activity?page=${p}` : "/admin/activity")} />
    </>
  );
}
