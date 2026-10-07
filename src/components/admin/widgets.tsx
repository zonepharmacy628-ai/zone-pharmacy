"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm">
      <Printer className="size-4" /> {label}
    </button>
  );
}
