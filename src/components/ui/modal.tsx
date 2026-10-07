"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default bg-navy-950/50" onClick={onClose} />
      <div
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-navy-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-navy-500 hover:bg-brand-50">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
