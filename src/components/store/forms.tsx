"use client";

import { Briefcase, CircleCheck, Home, MapPin, Pencil, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAddressAction, saveAddressAction, updateProfileAction } from "@/actions/account";
import { changePasswordAction, loginAction, registerAction } from "@/actions/auth";
import { getReorderItems, submitMedicineRequestAction } from "@/actions/shop";
import { ActionButton, ActionForm, CheckField, Field, FileField, SelectField, SubmitButton, TextArea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ADDRESS_LABELS } from "@/lib/constants";
import type { SavedAddress } from "./checkout-form";
import { useStore } from "./store-context";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  return (
    <ActionForm
      action={loginAction}
      onSuccess={(res) => {
        router.replace(res.data?.redirectTo ?? "/account");
        router.refresh();
      }}
      className="space-y-4"
    >
      {next && <input type="hidden" name="next" value={next} />}
      <Field name="email" label="Email Address" type="email" required autoComplete="email" maxLength={160} />
      <Field name="password" label="Password" type="password" required autoComplete="current-password" maxLength={100} />
      <SubmitButton className="w-full py-3">Sign In</SubmitButton>
    </ActionForm>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  return (
    <ActionForm
      action={registerAction}
      onSuccess={(res) => {
        router.replace(res.data?.redirectTo ?? "/account");
        router.refresh();
      }}
      className="space-y-4"
    >
      {next && <input type="hidden" name="next" value={next} />}
      <Field name="name" label="Full Name" required autoComplete="name" maxLength={80} />
      <Field name="email" label="Email Address" type="email" required autoComplete="email" maxLength={160} />
      <Field name="phone" label="Mobile Number" type="tel" required autoComplete="tel" inputMode="tel" placeholder="0300 1234567" maxLength={18} />
      <Field name="password" label="Password" type="password" required autoComplete="new-password" maxLength={100} hint="At least 8 characters." />
      <SubmitButton className="w-full py-3">Create Account</SubmitButton>
    </ActionForm>
  );
}

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  return (
    <ActionForm action={updateProfileAction} className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Full Name" required defaultValue={name} autoComplete="name" maxLength={80} />
      <Field name="phone" label="Mobile Number" type="tel" required defaultValue={phone} autoComplete="tel" maxLength={18} />
      <Field name="emailDisplay" label="Email Address" defaultValue={email} disabled hint="Your sign-in email cannot be changed." wrapClassName="sm:col-span-2" />
      <div className="sm:col-span-2">
        <SubmitButton>Save Changes</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      <Field name="currentPassword" label="Current Password" type="password" required autoComplete="current-password" maxLength={100} />
      <Field name="newPassword" label="New Password" type="password" required autoComplete="new-password" maxLength={100} hint="At least 8 characters." />
      <div className="sm:col-span-2">
        <SubmitButton>Update Password</SubmitButton>
      </div>
    </ActionForm>
  );
}

const ADDRESS_ICONS = { home: Home, office: Briefcase, other: MapPin } as const;

export function AddressManager({ addresses }: { addresses: SavedAddress[] }) {
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const current = editing && editing !== "new" ? editing : undefined;
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-navy-500">Save your Home, Office or other addresses for faster checkout.</p>
        <button type="button" onClick={() => setEditing("new")} className="btn btn-primary shrink-0">
          <Plus className="size-4" /> Add Address
        </button>
      </div>
      {addresses.length === 0 ? (
        <EmptyState icon={<MapPin />} title="No saved addresses" text="Add an address to speed up your next checkout." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => {
            const Icon = ADDRESS_ICONS[a.label as keyof typeof ADDRESS_ICONS] ?? MapPin;
            return (
              <li key={a.id} className="rounded-2xl border border-line p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                  <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-brand-600">
                    <Icon className="size-4" />
                  </span>
                  {ADDRESS_LABELS[a.label as keyof typeof ADDRESS_LABELS] ?? "Address"}
                  {a.isDefault && <span className="badge bg-brand-600 text-white">Default</span>}
                </p>
                <p className="mt-3 text-sm font-semibold text-navy-900">{a.fullName}</p>
                <p className="text-sm text-navy-700">
                  {a.address}, {a.city}
                </p>
                <p className="text-sm text-navy-700">{a.phone}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setEditing(a)} className="btn btn-outline btn-sm">
                    <Pencil className="size-3.5" /> Edit
                  </button>
                  <ActionButton action={() => deleteAddressAction(a.id)} confirm="Delete this address?" className="btn btn-danger btn-sm">
                    <Trash2 className="size-3.5" /> Delete
                  </ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={current ? "Edit Address" : "Add Address"}>
        <ActionForm action={saveAddressAction} onSuccess={() => setEditing(null)} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={current?.id ?? ""} />
          <SelectField name="label" label="Address Type" defaultValue={current?.label ?? "home"}>
            <option value="home">Home</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
          </SelectField>
          <Field name="fullName" label="Full Name" required defaultValue={current?.fullName ?? ""} maxLength={80} />
          <Field name="phone" label="Mobile Number" type="tel" required defaultValue={current?.phone ?? ""} placeholder="0300 1234567" maxLength={18} />
          <Field name="city" label="City" required defaultValue={current?.city ?? ""} maxLength={60} />
          <TextArea name="address" label="Complete Address" required defaultValue={current?.address ?? ""} maxLength={300} wrapClassName="sm:col-span-2" />
          <div className="sm:col-span-2">
            <CheckField name="isDefault" label="Use as my default address" defaultChecked={current?.isDefault ?? false} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
              Cancel
            </button>
            <SubmitButton>Save Address</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}

export function ReorderButton({ orderNumber, className }: { orderNumber: string; className?: string }) {
  const { addMany } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className ?? "btn btn-outline btn-sm"}
      onClick={() =>
        start(async () => {
          const res = await getReorderItems(orderNumber).catch(() => null);
          if (!res?.ok || !res.data) return toast.error(res?.message ?? "Could not re-order. Please try again.");
          addMany(res.data);
          toast.success(res.message ?? "Items added to your cart.");
          router.push("/cart");
        })
      }
    >
      <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} /> Re-order
    </button>
  );
}

export function MedicineRequestForm({ defaults }: { defaults: { medicine?: string; name?: string; email?: string; phone?: string } }) {
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <CircleCheck className="size-16 text-emerald-600" />
        <h2 className="mt-4 text-xl font-bold text-navy-900">Request Received</h2>
        <p className="mt-2 max-w-md text-sm text-navy-500">Our pharmacist will check availability with our suppliers and contact you by phone or email.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setDone(false)} className="btn btn-outline">
            Request Another Medicine
          </button>
          <Link href="/products" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }
  return (
    <ActionForm action={submitMedicineRequestAction} onSuccess={() => setDone(true)} className="grid gap-4 sm:grid-cols-2">
      <Field name="medicineName" label="Medicine Name" required maxLength={120} defaultValue={defaults.medicine ?? ""} placeholder="e.g. Panadol Extra 500mg" wrapClassName="sm:col-span-2" />
      <Field name="customerName" label="Your Name" required maxLength={80} autoComplete="name" defaultValue={defaults.name ?? ""} />
      <Field name="email" label="Email" type="email" required maxLength={160} autoComplete="email" defaultValue={defaults.email ?? ""} />
      <Field name="phone" label="Mobile Number" type="tel" required maxLength={18} autoComplete="tel" placeholder="0300 1234567" defaultValue={defaults.phone ?? ""} />
      <Field name="quantity" label="Quantity (optional)" type="number" min={1} max={1000} inputMode="numeric" placeholder="e.g. 2" />
      <TextArea name="message" label="Additional Message (optional)" maxLength={1000} placeholder="Strength, pack size, acceptable alternatives…" wrapClassName="sm:col-span-2" />
      <div className="sm:col-span-2">
        <FileField name="prescription" label="Upload Prescription (optional)" accept="image/jpeg,image/png,application/pdf" hint="PDF, JPG or PNG — max 4 MB. Visible only to our pharmacist." />
      </div>
      <SubmitButton className="py-3.5 text-base sm:col-span-2">
        <Send className="size-4" /> Submit Request
      </SubmitButton>
    </ActionForm>
  );
}
