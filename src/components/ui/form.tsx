"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useToast } from "./toast";

type FormState = { errors: Record<string, string>; pending: boolean; message: string | null };
const FormContext = createContext<FormState>({ errors: {}, pending: false, message: null });
export const useFormState = () => useContext(FormContext);

type ActionFormProps<T> = {
  action: (fd: FormData) => Promise<ActionResult<T>>;
  onSuccess?: (result: ActionResult<T>, form: HTMLFormElement) => void;
  /** Navigate here after success. */
  redirectTo?: string;
  resetOnSuccess?: boolean;
  /** Show the error message inline above the fields as well as in a toast. */
  inlineError?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Submits to a server action without the automatic form reset, so a failed
 * submission keeps everything the user typed. Field errors reach <Field> via context.
 */
export function ActionForm<T = undefined>({
  action,
  onSuccess,
  redirectTo,
  resetOnSuccess,
  inlineError = true,
  className,
  children,
}: ActionFormProps<T>) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ errors: Record<string, string>; message: string | null }>({ errors: {}, message: null });
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      noValidate
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          let result: ActionResult<T>;
          try {
            result = await action(fd);
          } catch {
            result = { ok: false, message: "Something went wrong. Please check your connection and try again." };
          }
          if (result.ok) {
            setState({ errors: {}, message: null });
            if (result.message) toast.success(result.message);
            if (resetOnSuccess) form.reset();
            onSuccess?.(result, form);
            if (redirectTo) router.push(redirectTo);
          } else {
            setState({ errors: result.errors ?? {}, message: result.message ?? "Something went wrong." });
            toast.error(result.message ?? "Something went wrong.");
            const first = Object.keys(result.errors ?? {})[0];
            if (first) form.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus();
          }
        });
      }}
    >
      <FormContext.Provider value={{ errors: state.errors, pending, message: state.message }}>
        {inlineError && state.message && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {state.message}
          </p>
        )}
        {children}
      </FormContext.Provider>
    </form>
  );
}

function FieldShell({
  label,
  name,
  required,
  hint,
  className,
  children,
}: {
  label?: string;
  name: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { errors } = useFormState();
  const error = errors[name];
  return (
    <div className={className}>
      {label && (
        <label htmlFor={`f-${name}`} className="label">
          {label} {required && <span className="text-brand-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-navy-500">{hint}</p>
      ) : null}
    </div>
  );
}

type Common = { label?: string; name: string; hint?: string; wrapClassName?: string };

export function Field({ label, name, hint, wrapClassName, className, ...props }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const { errors } = useFormState();
  return (
    <FieldShell label={label} name={name} required={props.required} hint={hint} className={wrapClassName}>
      <input
        id={`f-${name}`}
        name={name}
        aria-invalid={Boolean(errors[name])}
        className={cn("input", errors[name] && "border-red-400", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({ label, name, hint, wrapClassName, className, ...props }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { errors } = useFormState();
  return (
    <FieldShell label={label} name={name} required={props.required} hint={hint} className={wrapClassName}>
      <textarea
        id={`f-${name}`}
        name={name}
        rows={3}
        aria-invalid={Boolean(errors[name])}
        className={cn("input", errors[name] && "border-red-400", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({ label, name, hint, wrapClassName, className, children, ...props }: Common & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { errors } = useFormState();
  return (
    <FieldShell label={label} name={name} required={props.required} hint={hint} className={wrapClassName}>
      <select id={`f-${name}`} name={name} className={cn("input", errors[name] && "border-red-400", className)} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function CheckField({ label, name, hint, ...props }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" name={name} className="mt-0.5 size-4 shrink-0 rounded accent-brand-600" {...props} />
      <span>
        <span className="font-semibold text-navy-900">{label}</span>
        {hint && <span className="block text-xs text-navy-500">{hint}</span>}
      </span>
    </label>
  );
}

export function FileField({ label, name, hint, accept, required }: Common & { accept: string; required?: boolean }) {
  const { errors } = useFormState();
  return (
    <FieldShell label={label} name={name} hint={hint} required={required}>
      <input
        id={`f-${name}`}
        type="file"
        name={name}
        accept={accept}
        className={cn(
          "block w-full cursor-pointer rounded-xl border border-dashed border-brand-300 bg-brand-50/50 text-sm text-navy-700 file:mr-3 file:cursor-pointer file:border-0 file:bg-brand-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white",
          errors[name] && "border-red-400",
        )}
      />
    </FieldShell>
  );
}

export function SubmitButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormState();
  return (
    <button type="submit" disabled={pending || props.disabled} className={cn("btn btn-primary", className)} {...props}>
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** A button that runs a server action directly (delete, toggle, status change…). */
export function ActionButton<T>({
  action,
  confirm,
  onSuccess,
  className,
  children,
  ...props
}: {
  action: () => Promise<ActionResult<T>>;
  confirm?: string;
  onSuccess?: (result: ActionResult<T>) => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending || props.disabled}
      className={className}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          try {
            const result = await action();
            if (result.ok) {
              if (result.message) toast.success(result.message);
              onSuccess?.(result);
            } else {
              toast.error(result.message ?? "Something went wrong.");
            }
          } catch {
            toast.error("Something went wrong. Please try again.");
          }
        });
      }}
      {...props}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : children}
    </button>
  );
}
