"use client";

import {
  Boxes,
  CalendarClock,
  ChartColumn,
  ChevronDown,
  ClipboardList,
  ClipboardPlus,
  ExternalLink,
  Factory,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  MonitorCog,
  Package,
  Receipt,
  ScrollText,
  User,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/brand";
import { can, ROLE_LABELS, type Permission, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; perms?: Permission[]; ownerOnly?: boolean; badge?: number };

export function AdminShell({
  user,
  pharmacyName,
  logoFileId,
  badges,
  children,
}: {
  user: { name: string; email: string; role: Role; permissions: string[] };
  pharmacyName: string;
  logoFileId: string | null;
  badges: { orders: number; requests: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const isOwner = user.role === "owner";
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setAccount(false);
  }

  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: ClipboardList, perms: ["view_orders", "manage_orders"], badge: badges.orders },
    { href: "/admin/products", label: "Products", icon: Package, perms: ["manage_products"] },
    { href: "/admin/categories", label: "Categories", icon: LayoutGrid, perms: ["manage_products"] },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes, perms: ["manage_stock"] },
    { href: "/admin/purchases", label: "Purchases", icon: Receipt, perms: ["create_purchases", "view_purchases"] },
    { href: "/admin/suppliers", label: "Suppliers", icon: Factory, perms: ["manage_suppliers"] },
    { href: "/admin/expiry", label: "Expiry", icon: CalendarClock, perms: ["manage_stock", "manage_products"] },
    { href: "/admin/requests", label: "Medicine Requests", icon: ClipboardPlus, perms: ["manage_requests"], badge: badges.requests },
    { href: "/admin/reports", label: "Sales Reports", icon: ChartColumn, perms: ["view_reports"] },
    { href: "/admin/staff", label: "Staff", icon: UserCog, ownerOnly: true },
    { href: "/admin/activity", label: "Activity Log", icon: ScrollText, ownerOnly: true },
    { href: "/admin/settings", label: "Website Editor", icon: MonitorCog, ownerOnly: true },
  ];
  const visible = items.filter((i) => (i.ownerOnly ? user.role === "owner" : !i.perms || can(user, ...i.perms)));

  const nav = (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto p-3">
      <ul className="space-y-1">
        {visible.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                  active ? "bg-brand-600 text-white shadow-sm" : "text-navy-800 hover:bg-brand-50",
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold", active ? "bg-white text-brand-700" : "bg-brand-600 text-white")}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-line pt-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-brand-50">
          <ExternalLink className="size-5" /> View Website
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-red-50 hover:text-red-600">
            <LogOut className="size-5" /> Log Out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-40 bg-navy-900 text-white">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-white/10 lg:hidden">
            <Menu className="size-6" />
          </button>
          <Link href="/admin" aria-label="Admin dashboard">
            <Logo name={pharmacyName} logoFileId={logoFileId} light />
          </Link>
          <span className="ml-2 hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold md:inline">Admin Panel</span>
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setAccount((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={account}
              aria-label={`Account menu for ${user.name}`}
              className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-white/10"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500">
                <User className="size-5" />
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block max-w-40 truncate text-sm font-semibold">{user.name}</span>
                <span className="block text-xs text-white/70">{ROLE_LABELS[user.role]}</span>
              </span>
              <ChevronDown className={cn("size-4 text-white/70 transition-transform", account && "rotate-180")} />
            </button>
            {account && (
              <>
                <button type="button" aria-label="Close account menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setAccount(false)} />
                <div role="menu" className="absolute top-full right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-2 text-navy-900 shadow-pop">
                  <div className="border-b border-line px-3 pt-2 pb-3">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <p className="truncate text-xs text-navy-500">{user.email}</p>
                    <span className="badge mt-2 bg-brand-100 text-brand-700">{ROLE_LABELS[user.role]}</span>
                  </div>
                  <div className="py-1">
                    <AccountLink href="/admin/profile" icon={User}>
                      My Profile
                    </AccountLink>
                    {/* Owner-only pages. Each one re-checks the owner role on the server. */}
                    {isOwner && (
                      <>
                        <AccountLink href="/admin/staff" icon={UserCog}>
                          Staff &amp; Permissions
                        </AccountLink>
                        <AccountLink href="/admin/activity" icon={ScrollText}>
                          Activity Log
                        </AccountLink>
                        <AccountLink href="/admin/settings" icon={MonitorCog}>
                          Website Editor
                        </AccountLink>
                      </>
                    )}
                    <AccountLink href="/" icon={ExternalLink}>
                      View Website
                    </AccountLink>
                  </div>
                  <form action={logoutAction} className="border-t border-line pt-1">
                    <button type="submit" role="menuitem" className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-navy-800 hover:bg-red-50 hover:text-red-600">
                      <LogOut className="size-4" /> Log Out
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="no-print sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col border-r border-line bg-white lg:flex">{nav}</aside>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[86%] flex-col bg-white shadow-pop">
              <div className="flex items-center justify-between border-b border-line p-4">
                <Logo name={pharmacyName} logoFileId={logoFileId} />
                <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-brand-50">
                  <X className="size-5" />
                </button>
              </div>
              {nav}
            </div>
          </div>
        )}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function AccountLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-navy-800 hover:bg-brand-50">
      <Icon className="size-4 text-brand-600" /> {children}
    </Link>
  );
}
