"use client";

import { Heart, Home, LayoutGrid, LogIn, ShoppingCart, User, type LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "./store-context";

/** Tab contents. Lights up the moment the tab is tapped, while the next page is still loading. */
function TabBody({ icon: Icon, label, active, badge }: { icon: LucideIcon; label: string; active: boolean; badge?: number }) {
  const { pending } = useLinkStatus();
  const on = active || pending;
  return (
    <span className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium", on ? "text-brand-600" : "text-navy-500", pending && "animate-pulse")}>
      <span className="relative">
        <Icon className={cn("size-5", on && "fill-brand-100")} />
        {badge ? (
          <span className="absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      {label}
    </span>
  );
}

/** Bottom tab bar shown on phones and tablets, mirroring the approved mobile design. */
export function MobileNav() {
  const pathname = usePathname();
  const { user, count, wishlistIds, ready } = useStore();
  const accountHref = user ? "/account" : "/login";
  const tabs = [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    { href: "/products", label: "Categories", icon: LayoutGrid, active: pathname.startsWith("/products") || pathname.startsWith("/category") },
    { href: "/cart", label: "Cart", icon: ShoppingCart, active: pathname === "/cart", badge: ready ? count : 0 },
    {
      href: user ? "/account/wishlist" : "/login?next=/account/wishlist",
      label: "Wishlist",
      icon: Heart,
      active: pathname === "/account/wishlist",
      badge: wishlistIds.size,
    },
    {
      href: accountHref,
      label: user ? "Account" : "Login",
      icon: user ? User : LogIn,
      active: (pathname.startsWith("/account") && pathname !== "/account/wishlist") || pathname === "/login" || pathname === "/register",
    },
  ];
  return (
    <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map((t) => (
          <li key={t.label}>
            {/* Public tabs are fully prefetched so the first tap opens them at once; account tabs show their loading skeleton instantly. */}
            <Link
              href={t.href}
              prefetch={t.href.startsWith("/account") ? null : true}
              aria-current={t.active ? "page" : undefined}
              className="block touch-manipulation select-none active:bg-brand-50"
            >
              <TabBody icon={t.icon} label={t.label} active={t.active} badge={t.badge} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
