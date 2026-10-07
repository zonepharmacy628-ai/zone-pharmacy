import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import type { SiteSettings } from "@/lib/settings-shared";
import type { NavCategory } from "./header";

export function Footer({ settings, categories }: { settings: SiteSettings; categories: NavCategory[] }) {
  const links = "text-sm text-white/75 hover:text-white";
  return (
    <footer className="no-print mt-16 bg-navy-900 pb-20 text-white lg:pb-0">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo name={settings.pharmacyName} light />
          <p className="mt-4 max-w-xs text-sm text-white/75">{settings.tagline}. Genuine medicines and health products delivered to your door.</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold tracking-wider uppercase">Shop</h2>
          <ul className="space-y-2">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className={links}>
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/products" className={links}>
                All Products
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold tracking-wider uppercase">Customer</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/account" className={links}>
                My Account
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className={links}>
                My Orders
              </Link>
            </li>
            <li>
              <Link href="/track" className={links}>
                Track Order
              </Link>
            </li>
            <li>
              <Link href="/medicine-request" className={links}>
                Request a Medicine
              </Link>
            </li>
            <li>
              <Link href="/cart" className={links}>
                Cart
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold tracking-wider uppercase">Store</h2>
          <ul className="space-y-3 text-sm text-white/75">
            {settings.storeAddress && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" /> {settings.storeAddress}
              </li>
            )}
            {settings.storePhone && (
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0" /> {settings.storePhone}
              </li>
            )}
            {settings.storeEmail && (
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0" /> <span className="break-all">{settings.storeEmail}</span>
              </li>
            )}
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0" /> Open {settings.openingTime} – {settings.closingTime}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-4 text-center text-xs text-white/60">
          © {new Date().getFullYear()} {settings.pharmacyName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
