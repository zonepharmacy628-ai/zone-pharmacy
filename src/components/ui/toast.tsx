"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Toast = { id: number; kind: "success" | "error"; text: string };
type ToastApi = { success: (text: string) => void; error: (text: string) => void };

const ToastContext = createContext<ToastApi>({ success: () => {}, error: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: Toast["kind"], text: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, kind, text }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(() => ({ success: (t) => push("success", t), error: (t) => push("error", t) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-navy-900 shadow-pop"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            ) : (
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
            )}
            <span className="flex-1">{t.text}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-navy-400 hover:text-navy-900">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
