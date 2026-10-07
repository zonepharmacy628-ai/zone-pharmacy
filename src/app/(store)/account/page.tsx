import { desc, eq, sql } from "drizzle-orm";
import { ClipboardPlus, Heart, MapPin, Package, PackageSearch, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { OrdersTable } from "@/components/store/orders-table";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addresses, medicineRequests, orders, wishlist } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const db = await getDb();
  const count = sql<number>`count(*)::int`;
  const [[o], [w], [a], [r], recent, settings] = await Promise.all([
    db.select({ n: count }).from(orders).where(eq(orders.userId, user.id)),
    db.select({ n: count }).from(wishlist).where(eq(wishlist.userId, user.id)),
    db.select({ n: count }).from(addresses).where(eq(addresses.userId, user.id)),
    db.select({ n: count }).from(medicineRequests).where(eq(medicineRequests.userId, user.id)),
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(5),
    getSettings(),
  ]);
  const stats = [
    { label: "Total Orders", value: o.n, icon: Package, href: "/account/orders" },
    { label: "Wishlist Items", value: w.n, icon: Heart, href: "/account/wishlist" },
    { label: "Addresses", value: a.n, icon: MapPin, href: "/account/addresses" },
    { label: "Medicine Requests", value: r.n, icon: ClipboardPlus, href: "/account/requests" },
  ];
  const quick = [
    { label: "Shop Products", sub: "Browse the catalogue", icon: ShoppingCart, href: "/products" },
    { label: "Request Medicine", sub: "Not listed? Ask us", icon: ClipboardPlus, href: "/medicine-request" },
    { label: "Manage Addresses", sub: "Update delivery info", icon: MapPin, href: "/account/addresses" },
    { label: "Track Order", sub: "By order number", icon: PackageSearch, href: "/track" },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-100 to-white shadow-card">
        <div className="p-6 sm:p-8">
          <p className="text-lg text-navy-700">Welcome Back,</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{user.name}</h1>
          <p className="mt-2 max-w-lg text-sm text-navy-700">Manage your account, track orders, and get the best healthcare products — all in one place.</p>
        </div>
        <ul className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {stats.map((s) => (
            <li key={s.label} className="bg-white">
              <Link href={s.href} className="flex items-center gap-3 p-4 hover:bg-brand-50">
                <s.icon className="size-6 shrink-0 text-brand-600" />
                <span>
                  <span className="block text-xs text-navy-500">{s.label}</span>
                  <span className="block text-lg font-bold text-navy-900">{s.value}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="recent-orders">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-orders" className="h-section">
            Recent Orders
          </h2>
          <Link href="/account/orders" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View All Orders →
          </Link>
        </div>
        <OrdersTable orders={recent} currency={settings.currency} />
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="h-section mb-4">
          Quick Actions
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quick.map((q) => (
            <li key={q.label}>
              <Link href={q.href} className="flex h-full items-center gap-3 rounded-2xl border border-line p-4 transition hover:border-brand-300 hover:bg-brand-50">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                  <q.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-navy-900">{q.label}</span>
                  <span className="block text-xs text-navy-500">{q.sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
