"use client";

import { ClipboardPlus, Heart, LogOut, MapPin, Package, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { useStore } from "./store-context";

const LINKS = [
  { href: "/account", label: "My Account", sub: "Overview", icon: User },
  { href: "/account/orders", label: "Orders", sub: "Track your orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", sub: "Saved items", icon: Heart },
  { href: "/account/addresses", label: "Addresses", sub: "Manage delivery addresses", icon: MapPin },
  { href: "/account/requests", label: "Medicine Requests", sub: "Request unavailable medicines", icon: ClipboardPlus },
  { href: "/account/settings", label: "Settings", sub: "Profile & password", icon: Settings },
];

export function AccountNav() {
  const pathname = usePathname();
  const { user, wishlistIds } = useStore();
  return (
    <aside className="card self-start p-3">
      <div className="mb-2 flex items-center gap-3 border-b border-line p-3 pb-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
          <User className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-navy-900">{user?.name}</p>
          <p className="truncate text-xs text-navy-500">{user?.email}</p>
        </div>
      </div>
      <nav aria-label="Account">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:block lg:space-y-1">
          {LINKS.map((l) => {
            const active = l.href === "/account" ? pathname === "/account" : pathname.startsWith(l.href);
            return (
              <li key={l.href} className="shrink-0">
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition", active ? "bg-brand-100" : "hover:bg-brand-50")}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600")}>
                    <l.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold whitespace-nowrap text-navy-900">{l.label}</span>
                    <span className="hidden text-xs text-navy-500 lg:block">{l.sub}</span>
                  </span>
                  {l.href === "/account/wishlist" && wishlistIds.size > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{wishlistIds.size}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <form action={logoutAction} className="mt-2 border-t border-line pt-2">
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-800 hover:bg-red-50 hover:text-red-600">
          <span className="grid size-9 place-items-center">
            <LogOut className="size-4" />
          </span>
          Log Out
        </button>
      </form>
    </aside>
  );
}
