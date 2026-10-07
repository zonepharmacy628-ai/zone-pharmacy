import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page Not Found" };

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] flex-1 place-items-center px-4">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-100 text-brand-600">
          <SearchX className="size-8" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-navy-900">Page not found</h1>
        <p className="mt-2 text-sm text-navy-500">The page you are looking for doesn&apos;t exist or has been moved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
          <Link href="/products" className="btn btn-outline">
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
