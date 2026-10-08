import { MonitorCog, ScrollText, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";
import { AdminPasswordForm, AdminProfileForm, OwnerEmailForm } from "@/components/admin/profile-forms";
import { Badge, PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABELS, type Permission } from "@/lib/permissions";

export const metadata = { title: "My Profile" };

const OWNER_LINKS = [
  { href: "/admin/staff", label: "Staff & Permissions", text: "Add staff, set roles, enable or disable accounts", icon: UserCog },
  { href: "/admin/activity", label: "Activity Log", text: "Every important admin action and who made it", icon: ScrollText },
  { href: "/admin/settings", label: "Website Editor", text: "Branding, homepage, delivery, payment and store settings", icon: MonitorCog },
];

export default async function AdminProfilePage() {
  // Any signed-in staff member may manage their own profile; the owner-only parts are gated below and in the actions.
  const user = await requireStaffPage();
  const isOwner = user.role === "owner";

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your admin account details and sign-in settings." />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="profile-info">
            <h2 id="profile-info" className="h-section mb-4">
              Profile Information
            </h2>
            <AdminProfileForm name={user.name} phone={user.phone} />
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="profile-email">
            <h2 id="profile-email" className="h-section mb-1">
              Login Email
            </h2>
            {isOwner ? (
              <>
                <p className="mb-4 text-sm text-navy-500">This is the email you sign in with.</p>
                <OwnerEmailForm email={user.email} />
              </>
            ) : (
              <p className="text-sm text-navy-700">
                <span className="font-semibold break-all text-navy-900">{user.email}</span>
                <span className="mt-1 block text-navy-500">Your login email is managed by the owner.</span>
              </p>
            )}
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="profile-password">
            <h2 id="profile-password" className="h-section mb-1">
              Change Password
            </h2>
            <p className="mb-4 text-sm text-navy-500">Changing your password signs you out on your other devices.</p>
            <AdminPasswordForm />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="profile-account">
            <h2 id="profile-account" className="h-section mb-4">
              Account
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Name</dt>
                <dd className="font-semibold text-navy-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Email</dt>
                <dd className="break-all text-navy-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Role</dt>
                <dd className="mt-1">
                  <Badge tone={isOwner ? "purple" : "blue"}>{ROLE_LABELS[user.role]}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Access</dt>
                <dd className="mt-1 text-navy-700">
                  {isOwner ? (
                    <span className="flex items-center gap-1.5 font-medium text-navy-900">
                      <ShieldCheck className="size-4 text-brand-600" /> Full access to everything
                    </span>
                  ) : user.permissions.length ? (
                    <ul className="list-inside list-disc space-y-0.5">
                      {user.permissions.map((p) => (
                        <li key={p}>{PERMISSIONS[p as Permission] ?? p}</li>
                      ))}
                    </ul>
                  ) : (
                    "No permissions assigned yet."
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {isOwner && (
            <section className="card p-3" aria-labelledby="profile-owner">
              <h2 id="profile-owner" className="h-section px-2 pt-2 pb-1">
                Owner Controls
              </h2>
              <ul>
                {OWNER_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-brand-50">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                        <l.icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy-900">{l.label}</span>
                        <span className="block text-xs text-navy-500">{l.text}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
