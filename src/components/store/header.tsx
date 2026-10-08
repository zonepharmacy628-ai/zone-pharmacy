"use client";

import {
  ChevronDown,
  ClipboardPlus,
  Heart,
  LayoutGrid,
  LogIn,
  Menu,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CategoryIcon, Logo } from "@/components/brand";
import { cn, formatMoney } from "@/lib/utils";
import { useStore } from "./store-context";

export type NavCategory = { id: number; name: string; slug: string; icon: string; productCount: number };

function SearchForm({ id, className }: { id: string; className?: string }) {
  return (
    <form action="/products" role="search" className={cn("flex", className)}>
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <input
        id={id}
        type="search"
        name="q"
        maxLength={80}
        placeholder="Search for medicines, health products, brands..."
        className="input rounded-r-none border-r-0 sm:py-3"
      />
      <button type="submit" aria-label="Search" className="btn btn-primary rounded-l-none px-4 sm:px-5">
        <Search className="size-5" />
      </button>
    </form>
  );
}

function IconLink({
  href,
  label,
  mobileLabel,
  badge,
  children,
  sub,
}: {
  href: string;
  label: string;
  /** Shorter label shown under the icon on phones, where the full one does not fit beside the logo. */
  mobileLabel?: string;
  badge?: number;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-label={label} className="group flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 text-xs font-medium text-navy-800 hover:text-brand-600">
      <span className="relative">
        {children}
        {badge ? (
          <span className="absolute -top-2 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      {mobileLabel && <span className="text-[11px] leading-none sm:hidden">{mobileLabel}</span>}
      <span className="hidden sm:block">{label}</span>
      {sub && <span className="hidden text-[11px] text-navy-500 lg:block">{sub}</span>}
    </Link>
  );
}

export function Header({ categories }: { categories: NavCategory[] }) {
  const { settings, user, count, subtotal, wishlistIds, ready } = useStore();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<"all" | "more" | null>(null);

  // Close any open menu when the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawer(false);
    setMenu(null);
  }

  const primary = categories.slice(0, 6);
  const rest = categories.slice(6);
  // The storefront only ever links to the customer account or login/register, never to the admin panel.
  const accountHref = user ? "/account" : "/login";

  return (
    <header className="no-print relative z-50 bg-white shadow-[0_1px_0_var(--color-line)]">
      <div className="bg-navy-900 text-white">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-xs font-medium">
          <p className="flex min-w-0 items-center gap-2">
            <Truck className="size-4 shrink-0" />
            <span className="truncate">{settings.announcement || `Delivery in ${settings.deliveryTime}`}</span>
          </p>
          <div className="hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4" /> 100% Genuine Medicines
            </span>
            <Link href="/track" className="flex h-9 items-center gap-1.5 hover:text-brand-300">
              <PackageSearch className="size-4" /> Track Order
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page flex items-center gap-3 py-3 lg:gap-8 lg:py-4">
        <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="-ml-1 rounded-lg p-2 text-navy-900 hover:bg-brand-50 lg:hidden">
          <Menu className="size-6" />
        </button>
        <Link href="/" aria-label={`${settings.pharmacyName} home`} className="shrink-0">
          <Logo name={settings.pharmacyName} logoFileId={settings.logoFileId} />
        </Link>
        <SearchForm id="site-search" className="hidden flex-1 md:flex" />
        <div className="ml-auto flex items-center gap-2 sm:gap-7">
          {/* On phones the wishlist lives in the bottom tab bar instead. */}
          <span className="hidden sm:contents">
            <IconLink href={user ? "/account/wishlist" : "/login?next=/account/wishlist"} label="Wishlist" badge={wishlistIds.size}>
              <Heart className="size-6" />
            </IconLink>
          </span>
          {/* Login / Register (or Account) is shown in the header at every screen size. */}
          <IconLink href={accountHref} label={user ? "Account" : "Login / Register"} mobileLabel={user ? "Account" : "Login"}>
            {user ? <User className="size-6" /> : <LogIn className="size-6" />}
          </IconLink>
          <IconLink href="/cart" label="Cart" mobileLabel="Cart" badge={ready ? count : 0} sub={ready && count ? formatMoney(subtotal, settings.currency) : undefined}>
            <ShoppingCart className="size-6" />
          </IconLink>
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchForm id="site-search-mobile" />
      </div>

      <nav aria-label="Main" className="hidden border-t border-line lg:block">
        <div className="container-page flex items-center gap-1">
          <div className="relative py-2" onMouseLeave={() => setMenu((m) => (m === "all" ? null : m))}>
            <button
              type="button"
              aria-expanded={menu === "all"}
              onClick={() => setMenu(menu === "all" ? null : "all")}
              onMouseEnter={() => setMenu("all")}
              className="btn btn-primary mr-4 px-5"
            >
              <Menu className="size-4" /> All Categories
            </button>
            {menu === "all" && (
              <div className="absolute top-full left-0 z-50 grid w-[560px] grid-cols-2 gap-1 rounded-2xl border border-line bg-white p-3 shadow-pop">
                {categories.map((c) => (
                  <Link key={c.id} href={`/category/${c.slug}`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-navy-800 hover:bg-brand-50 hover:text-brand-700">
                    <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-brand-600">
                      <CategoryIcon name={c.icon} className="size-4" />
                    </span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-navy-400">{c.productCount}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <NavLink href="/" active={pathname === "/"}>
            Home
          </NavLink>
          {primary.map((c, i) => (
            <NavLink key={c.id} href={`/category/${c.slug}`} active={pathname === `/category/${c.slug}`} className={i >= 4 ? "hidden xl:block" : undefined}>
              {c.name}
            </NavLink>
          ))}
          <div className="relative" onMouseLeave={() => setMenu((m) => (m === "more" ? null : m))}>
            <button
              type="button"
              aria-expanded={menu === "more"}
              onClick={() => setMenu(menu === "more" ? null : "more")}
              onMouseEnter={() => setMenu("more")}
              className="flex items-center gap-1 px-3 py-4 text-sm font-medium text-navy-800 hover:text-brand-600"
            >
              More <ChevronDown className="size-4" />
            </button>
            {menu === "more" && (
              <div className="absolute top-full right-0 z-50 w-64 rounded-2xl border border-line bg-white p-2 shadow-pop">
                {/* The two categories hidden from the row on narrower screens appear here instead. */}
                {primary.slice(4).map((c) => (
                  <Link key={c.id} href={`/category/${c.slug}`} className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-800 hover:bg-brand-50 hover:text-brand-700 xl:hidden">
                    {c.name}
                  </Link>
                ))}
                {rest.map((c) => (
                  <Link key={c.id} href={`/category/${c.slug}`} className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-800 hover:bg-brand-50 hover:text-brand-700">
                    {c.name}
                  </Link>
                ))}
                <div className="my-1 border-t border-line" />
                <Link href="/products" className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-800 hover:bg-brand-50">
                  All Products
                </Link>
                <Link href="/medicine-request" className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-800 hover:bg-brand-50">
                  Request a Medicine
                </Link>
                <Link href="/track" className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-800 hover:bg-brand-50">
                  Track Order
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-navy-950/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-line p-4">
              <Logo name={settings.pharmacyName} logoFileId={settings.logoFileId} />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-brand-50">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <DrawerLink href={accountHref} icon={user ? <User className="size-4" /> : <LogIn className="size-4" />}>
                {user ? "My Account" : "Login / Register"}
              </DrawerLink>
              <DrawerLink href="/products" icon={<LayoutGrid className="size-4" />}>
                All Products
              </DrawerLink>
              <DrawerLink href="/medicine-request" icon={<ClipboardPlus className="size-4" />}>
                Request a Medicine
              </DrawerLink>
              <DrawerLink href="/track" icon={<PackageSearch className="size-4" />}>
                Track Order
              </DrawerLink>
              <p className="mt-4 mb-1 px-3 text-xs font-bold tracking-wider text-navy-400 uppercase">Categories</p>
              {categories.map((c) => (
                <DrawerLink key={c.id} href={`/category/${c.slug}`} icon={<CategoryIcon name={c.icon} className="size-4" />}>
                  {c.name}
                </DrawerLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, active, className, children }: { href: string; active: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-b-2 px-3 py-4 text-sm font-medium whitespace-nowrap transition-colors",
        active ? "border-brand-600 text-brand-600" : "border-transparent text-navy-800 hover:text-brand-600",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function DrawerLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-800 hover:bg-brand-50">
      <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-brand-600">{icon}</span>
      {children}
    </Link>
  );
}
