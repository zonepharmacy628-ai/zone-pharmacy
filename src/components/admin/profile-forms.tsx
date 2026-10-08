"use client";

import { changeOwnerEmailAction, updateMyProfileAction } from "@/actions/admin/staff";
import { changePasswordAction } from "@/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";

export function AdminProfileForm({ name, phone }: { name: string; phone: string }) {
  return (
    <ActionForm action={updateMyProfileAction} className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Full Name" required defaultValue={name} autoComplete="name" maxLength={80} />
      <Field name="phone" label="Mobile Number" type="tel" defaultValue={phone} autoComplete="tel" maxLength={18} placeholder="0300 1234567" />
      <div className="sm:col-span-2">
        <SubmitButton>Save Changes</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** Owner only. The server action re-checks the owner role and the current password. */
export function OwnerEmailForm({ email }: { email: string }) {
  return (
    <ActionForm action={changeOwnerEmailAction} className="grid gap-4 sm:grid-cols-2">
      <Field name="email" label="Login Email" type="email" required defaultValue={email} autoComplete="email" maxLength={160} />
      <Field name="currentPassword" label="Current Password" type="password" required autoComplete="current-password" maxLength={100} hint="Needed to confirm it is you." />
      <div className="sm:col-span-2">
        <SubmitButton>Update Email</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function AdminPasswordForm() {
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
