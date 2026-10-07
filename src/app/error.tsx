"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60vh] flex-1 place-items-center px-4">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert className="size-8" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-navy-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-navy-500">We couldn&apos;t load this page. Please try again.</p>
        {error.digest && <p className="mt-2 text-xs text-navy-400">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try Again
          </button>
          <Link href="/" className="btn btn-outline">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
