import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/store/forms";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";

export const metadata: Metadata = { title: "Create Account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect(isStaffRole(user.role) ? "/admin" : "/account");
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="h-page">Create Your Account</h1>
        <p className="mt-1 mb-6 text-sm text-navy-500">Save addresses, keep a wishlist and re-order in one tap.</p>
        <RegisterForm next={next} />
        <p className="mt-6 text-center text-sm text-navy-700">
          Already have an account?{" "}
          <Link href={`/login${qs}`} className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
