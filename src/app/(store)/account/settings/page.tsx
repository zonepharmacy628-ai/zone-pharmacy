import { PasswordForm, ProfileForm } from "@/components/store/forms";
import { requireUser } from "@/lib/auth";

export default async function AccountSettingsPage() {
  const user = await requireUser("/account/settings");
  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h1 className="h-page mb-1">Account Settings</h1>
        <p className="mb-5 text-sm text-navy-500">Update your profile information.</p>
        <ProfileForm name={user.name} email={user.email} phone={user.phone} />
      </section>
      <section className="card p-5 sm:p-6">
        <h2 className="h-section mb-1">Change Password</h2>
        <p className="mb-5 text-sm text-navy-500">Changing your password signs you out on your other devices.</p>
        <PasswordForm />
      </section>
    </div>
  );
}
