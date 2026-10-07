import { ChartColumn, FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getSalesReport, REPORT_PRESETS, resolveRange, type ReportPreset } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, formatMoney, todayPk } from "@/lib/utils";

export const metadata = { title: "Sales Reports" };

type Row = { name: string; quantity: number; sales: number; cost: number; profit: number };

function Breakdown({ title, rows, currency, nameLabel }: { title: string; rows: Row[]; currency: string; nameLabel: string }) {
  return (
    <section className="card" aria-label={title}>
      <h2 className="h-section p-5 pb-3">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState icon={<ChartColumn />} title="No sales in this period" />
      ) : (
        <div className="table-wrap">
          <table className="table-base min-w-[560px]">
            <thead>
              <tr>
                <th>{nameLabel}</th>
                <th className="text-right">Qty Sold</th>
                <th className="text-right">Sales</th>
                <th className="text-right">Purchase Cost</th>
                <th className="text-right">Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="font-medium text-navy-900">{r.name}</td>
                  <td className="text-right">{r.quantity}</td>
                  <td className="text-right font-semibold whitespace-nowrap">{formatMoney(r.sales, currency)}</td>
                  <td className="text-right whitespace-nowrap text-navy-700">{formatMoney(r.cost, currency)}</td>
                  <td className={cn("text-right font-semibold whitespace-nowrap", r.profit < 0 ? "text-red-600" : "text-emerald-700")}>{formatMoney(r.profit, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireStaffPage("view_reports");
  const sp = await searchParams;
  const range = resolveRange(sp.range, sp.from, sp.to);
  const [report, settings] = await Promise.all([getSalesReport(range.from, range.to), getSettings()]);
  const c = settings.currency;
  const exportQs = `range=${range.preset}&from=${range.from}&to=${range.to}`;
  const period = range.from === range.to ? formatDate(range.from) : `${formatDate(range.from)} – ${formatDate(range.to)}`;

  const metrics: [string, string | number, string?][] = [
    ["Total Orders", report.totalOrders],
    ["Total Sales", formatMoney(report.totalSales, c)],
    ["Products Sold", report.productsSold],
    ["Delivery Charges", formatMoney(report.deliveryCharges, c)],
    ["Net Sales", formatMoney(report.netSales, c), "Sales minus delivery charges"],
    ["Gross Profit", formatMoney(report.grossProfit, c), "Sales − Purchase Cost"],
    ["COD Sales", formatMoney(report.codSales, c)],
    ["JazzCash Sales", formatMoney(report.jazzcashSales, c)],
    ["Bank Transfer Sales", formatMoney(report.bankSales, c)],
    ["Cancelled Orders", report.cancelledOrders],
  ];

  return (
    <>
      <PageHeader title="Sales Reports" subtitle={period}>
        <a href={`/api/reports/export?format=pdf&${exportQs}`} className="btn btn-outline btn-sm">
          <FileText className="size-4" /> Export PDF
        </a>
        <a href={`/api/reports/export?format=xlsx&${exportQs}`} className="btn btn-outline btn-sm">
          <FileSpreadsheet className="size-4" /> Export Excel
        </a>
      </PageHeader>

      <div className="card mb-6 flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto">
          {(Object.keys(REPORT_PRESETS) as ReportPreset[])
            .filter((p) => p !== "custom")
            .map((p) => (
              <li key={p} className="shrink-0">
                <Link href={`/admin/reports?range=${p}`} className={cn("btn btn-sm", range.preset === p ? "btn-primary" : "btn-outline")}>
                  {REPORT_PRESETS[p]}
                </Link>
              </li>
            ))}
        </ul>
        <form action="/admin/reports" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="range" value="custom" />
          <div>
            <label htmlFor="rep-from" className="mb-1 block text-xs font-semibold text-navy-700">
              From
            </label>
            <input id="rep-from" type="date" name="from" required max={todayPk()} defaultValue={range.from} className="input py-2" />
          </div>
          <div>
            <label htmlFor="rep-to" className="mb-1 block text-xs font-semibold text-navy-700">
              To
            </label>
            <input id="rep-to" type="date" name="to" required max={todayPk()} defaultValue={range.to} className="input py-2" />
          </div>
          <button type="submit" className={cn("btn btn-sm", range.preset === "custom" ? "btn-primary" : "btn-outline")}>
            Apply Custom Range
          </button>
        </form>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {metrics.map(([label, value, hint]) => (
          <div key={label} className="card p-4">
            <dt className="text-xs font-medium text-navy-500">{label}</dt>
            <dd className="mt-1 truncate text-xl font-extrabold text-navy-900">{value}</dd>
            {hint && <dd className="mt-0.5 text-[11px] text-navy-400">{hint}</dd>}
          </div>
        ))}
      </dl>

      <div className="space-y-6">
        <Breakdown title="Product-wise Sales" nameLabel="Product" rows={report.byProduct} currency={c} />
        <Breakdown title="Category-wise Sales" nameLabel="Category" rows={report.byCategory} currency={c} />
      </div>
    </>
  );
}
