import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getStaff } from "@/lib/auth";
import { getSalesReport, resolveRange, type SalesReport } from "@/lib/reports";
import { getSettings } from "@/lib/settings";

type Table = { title: string; head: string[]; rows: (string | number)[][] };

function summaryRows(r: SalesReport): [string, number][] {
  return [
    ["Total Orders", r.totalOrders],
    ["Total Sales", r.totalSales],
    ["Products Sold", r.productsSold],
    ["Delivery Charges", r.deliveryCharges],
    ["Net Sales", r.netSales],
    ["COD Sales", r.codSales],
    ["JazzCash Sales", r.jazzcashSales],
    ["Bank Transfer Sales", r.bankSales],
    ["Cancelled Orders", r.cancelledOrders],
    ["Purchase Cost", r.purchaseCost],
    ["Gross Profit (Sales - Purchase Cost)", r.grossProfit],
  ];
}

const BREAKDOWN_HEAD = ["Qty Sold", "Sales", "Purchase Cost", "Gross Profit"];
const breakdown = (rows: SalesReport["byProduct"]) => rows.map((x) => [x.name, x.quantity, x.sales, x.cost, x.profit]);

async function toXlsx(r: SalesReport, name: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = name;
  const bold = { bold: true };
  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 38 }, { width: 18 }];
  summary.addRow([`${name} — Sales Report`]).font = { bold: true, size: 14 };
  summary.addRow([`Period: ${r.from} to ${r.to}`]);
  summary.addRow([]);
  summary.addRow(["Metric", "Value"]).font = bold;
  for (const row of summaryRows(r)) summary.addRow(row);
  for (const [title, label, rows] of [
    ["Product-wise Sales", "Product", r.byProduct],
    ["Category-wise Sales", "Category", r.byCategory],
  ] as const) {
    const ws = wb.addWorksheet(title);
    ws.columns = [{ width: 40 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 16 }];
    ws.addRow([label, ...BREAKDOWN_HEAD]).font = bold;
    for (const row of breakdown(rows)) ws.addRow(row);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Standard PDF fonts only cover WinAnsi, so anything outside Latin-1 is replaced.
const safe = (s: string | number) => String(s).replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

async function toPdf(r: SalesReport, name: string, currency: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.1, 0.11, 0.32);
  const purple = rgb(0.35, 0.25, 0.85);
  const grey = rgb(0.4, 0.42, 0.55);
  const [W, H, M] = [595.28, 841.89, 40];
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const need = (space: number) => {
    if (y - space < M) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };
  const fit = (text: string, width: number, size: number, f = font) => {
    let t = safe(text);
    if (f.widthOfTextAtSize(t, size) <= width) return t;
    while (t.length > 1 && f.widthOfTextAtSize(`${t}...`, size) > width) t = t.slice(0, -1);
    return `${t}...`;
  };

  page.drawText(safe(name), { x: M, y: y - 6, size: 20, font: boldFont, color: navy });
  y -= 30;
  page.drawText("Sales Report", { x: M, y, size: 13, font: boldFont, color: purple });
  page.drawText(`Period: ${r.from} to ${r.to}`, { x: W - M - font.widthOfTextAtSize(`Period: ${r.from} to ${r.to}`, 10), y, size: 10, font, color: grey });
  y -= 24;

  const tables: Table[] = [
    {
      title: "Summary",
      head: ["Metric", `Value (${safe(currency)} where applicable)`],
      rows: summaryRows(r).map(([k, v]) => [k, k.includes("Orders") || k === "Products Sold" ? v : money(v)]),
    },
    { title: "Product-wise Sales", head: ["Product", ...BREAKDOWN_HEAD], rows: breakdown(r.byProduct).map((x) => x.map((v, i) => (i >= 2 ? money(v as number) : v))) },
    { title: "Category-wise Sales", head: ["Category", ...BREAKDOWN_HEAD], rows: breakdown(r.byCategory).map((x) => x.map((v, i) => (i >= 2 ? money(v as number) : v))) },
  ];

  for (const table of tables) {
    need(70);
    page.drawText(table.title, { x: M, y, size: 12, font: boldFont, color: navy });
    y -= 18;
    const cols = table.head.length;
    const first = cols === 2 ? 330 : 215;
    const other = (W - 2 * M - first) / (cols - 1);
    const xOf = (i: number) => (i === 0 ? M : M + first + (i - 1) * other);
    const drawRow = (cells: (string | number)[], header: boolean) => {
      need(18);
      if (header) page.drawRectangle({ x: M, y: y - 5, width: W - 2 * M, height: 17, color: rgb(0.96, 0.95, 1) });
      cells.forEach((cell, i) => {
        const f = header ? boldFont : font;
        const width = (i === 0 ? first : other) - 8;
        const text = fit(String(cell), width, 9, f);
        const x = i === 0 ? xOf(i) + 4 : xOf(i) + other - 4 - f.widthOfTextAtSize(text, 9);
        page.drawText(text, { x, y, size: 9, font: f, color: header ? navy : rgb(0.15, 0.16, 0.3) });
      });
      y -= 16;
    };
    drawRow(table.head, true);
    if (table.rows.length === 0) {
      page.drawText("No sales in this period.", { x: M + 4, y, size: 9, font, color: grey });
      y -= 16;
    }
    for (const row of table.rows) drawRow(row, false);
    y -= 14;
  }
  return Buffer.from(await pdf.save());
}

export async function GET(req: Request) {
  // Same permission check as the on-screen report.
  const staff = await getStaff("view_reports");
  if (!staff) return new Response("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const range = resolveRange(url.searchParams.get("range") ?? undefined, url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  const [report, settings] = await Promise.all([getSalesReport(range.from, range.to), getSettings()]);
  const isPdf = url.searchParams.get("format") === "pdf";
  const body = isPdf ? await toPdf(report, settings.pharmacyName, settings.currency) : await toXlsx(report, settings.pharmacyName);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sales-report-${range.from}_to_${range.to}.${isPdf ? "pdf" : "xlsx"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
