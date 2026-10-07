import type { Metadata } from "next";
import { AccountNav } from "@/components/store/account-nav";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  return (
    <div className="container-page grid gap-6 py-5 sm:py-8 lg:grid-cols-[280px_1fr]">
      <AccountNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
