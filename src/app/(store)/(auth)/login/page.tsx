import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/store/forms";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";

export const metadata: Metadata = { title: "Sign In", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect(isStaffRole(user.role) ? "/admin" : "/account");
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="h-page">Welcome Back</h1>
        <p className="mt-1 mb-6 text-sm text-navy-500">Sign in to your account to track orders and check out faster.</p>
        <LoginForm next={next} />
        <p className="mt-6 text-center text-sm text-navy-700">
          New to MediZone?{" "}
          <Link href={`/register${qs}`} className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
