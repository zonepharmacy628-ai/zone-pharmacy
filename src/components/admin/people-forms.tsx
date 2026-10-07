"use client";

import { FileText, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { updateMedicineRequestAction } from "@/actions/admin/orders";
import { saveStaffAction, setStaffActiveAction } from "@/actions/admin/staff";
import { ActionButton, ActionForm, CheckField, Field, SelectField, SubmitButton, TextArea } from "@/components/ui/form";
import { Badge, EmptyState, RequestStatusBadge } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS } from "@/lib/constants";
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS, STAFF_ROLES, type Permission, type Role, type StaffRole } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/utils";

type Staff = { id: number; name: string; email: string; phone: string; role: Role; permissions: string[]; active: boolean; createdAt: string };

function StaffForm({ staff, onDone }: { staff?: Staff; onDone: () => void }) {
  const [role, setRole] = useState<StaffRole>((staff?.role as StaffRole) ?? "manager");
  const [perms, setPerms] = useState<Set<string>>(new Set(staff?.permissions ?? ROLE_DEFAULT_PERMISSIONS.manager));
  return (
    <ActionForm action={saveStaffAction} onSuccess={onDone} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={staff?.id ?? ""} />
      <Field name="name" label="Name" required maxLength={80} defaultValue={staff?.name ?? ""} />
      <Field name="phone" label="Mobile" type="tel" maxLength={18} defaultValue={staff?.phone ?? ""} />
      <Field name="email" label="Login Email" type="email" required maxLength={160} autoComplete="off" defaultValue={staff?.email ?? ""} />
      <Field
        name="password"
        label={staff ? "New Password" : "Password"}
        type="password"
        required={!staff}
        maxLength={100}
        autoComplete="new-password"
        hint={staff ? "Leave blank to keep the current password." : "At least 8 characters."}
      />
      <SelectField
        name="role"
        label="Role"
        value={role}
        onChange={(e) => {
          const next = e.target.value as StaffRole;
          setRole(next);
          // Choosing a role pre-selects its usual permissions; the owner can still fine-tune them.
          setPerms(new Set(ROLE_DEFAULT_PERMISSIONS[next]));
        }}
      >
        {Object.entries(STAFF_ROLES).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </SelectField>
      <div className="flex items-end pb-2.5">
        <CheckField name="active" label="Account active" hint="Inactive staff cannot sign in." defaultChecked={staff?.active ?? true} />
      </div>
      <fieldset className="rounded-2xl border border-line p-4 sm:col-span-2">
        <legend className="px-2 text-sm font-bold text-navy-900">Permissions</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ALL_PERMISSIONS.map((p: Permission) => (
            <CheckField
              key={p}
              name="permissions"
              value={p}
              label={PERMISSIONS[p]}
              checked={perms.has(p)}
              onChange={(e) =>
                setPerms((s) => {
                  const next = new Set(s);
                  if (e.target.checked) next.add(p);
                  else next.delete(p);
                  return next;
                })
              }
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-navy-500">Staff, permissions, the Website Editor and payment/store settings are always Owner-only.</p>
      </fieldset>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          Cancel
        </button>
        <SubmitButton>{staff ? "Save Changes" : "Add Staff"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function StaffManager({ staff, owner }: { staff: Staff[]; owner: { name: string; email: string } | null }) {
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const current = editing && editing !== "new" ? editing : undefined;
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setEditing("new")} className="btn btn-primary">
          <Plus className="size-4" /> Add Staff
        </button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table-base min-w-[820px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Login Email</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {owner && (
                <tr>
                  <td className="font-semibold text-navy-900">{owner.name}</td>
                  <td>{owner.email}</td>
                  <td>—</td>
                  <td>
                    <Badge>Owner</Badge>
                  </td>
                  <td className="text-xs text-navy-700">Full access</td>
                  <td>
                    <Badge tone="green">Active</Badge>
                  </td>
                  <td className="text-xs text-navy-500">Protected</td>
                </tr>
              )}
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="font-semibold text-navy-900">{s.name}</p>
                    <p className="text-xs text-navy-500">Added {formatDate(s.createdAt)}</p>
                  </td>
                  <td>{s.email}</td>
                  <td className="whitespace-nowrap">{s.phone || "—"}</td>
                  <td>
                    <Badge tone="blue">{ROLE_LABELS[s.role]}</Badge>
                  </td>
                  <td className="max-w-64 text-xs text-navy-700">
                    {s.permissions.length ? s.permissions.map((p) => PERMISSIONS[p as Permission] ?? p).join(", ") : "No permissions"}
                  </td>
                  <td>{s.active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Deactivated</Badge>}</td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditing(s)} className="btn btn-outline btn-sm">
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <ActionButton
                        action={() => setStaffActiveAction(s.id, !s.active)}
                        confirm={s.active ? `Deactivate ${s.name}? They will be signed out immediately.` : undefined}
                        className={s.active ? "btn btn-danger btn-sm" : "btn btn-outline btn-sm"}
                      >
                        {s.active ? "Deactivate" : "Reactivate"}
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {staff.length === 0 && <EmptyState icon={<Plus />} title="No staff yet" text="Add managers, pharmacists, sales or inventory staff and choose what each can do." />}
      </div>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={current ? `Edit ${current.name}` : "Add Staff"} wide>
        <StaffForm staff={current} onDone={() => setEditing(null)} />
      </Modal>
    </>
  );
}

type MedicineRequest = {
  id: number;
  medicineName: string;
  customerName: string;
  email: string;
  phone: string;
  quantity: number | null;
  message: string;
  prescriptionFileId: string | null;
  status: string;
  adminNote: string;
  createdAt: string;
};

export function RequestList({ requests }: { requests: MedicineRequest[] }) {
  const [editing, setEditing] = useState<MedicineRequest | null>(null);
  return (
    <>
      <div className="table-wrap">
        <table className="table-base min-w-[900px]">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Message</th>
              <th>Prescription</th>
              <th>Date</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="font-semibold text-navy-900">
                  {r.medicineName}
                  {r.quantity ? <span className="font-normal text-navy-500"> × {r.quantity}</span> : null}
                </td>
                <td>{r.customerName}</td>
                <td className="text-xs text-navy-700">
                  {r.phone}
                  <br />
                  {r.email}
                </td>
                <td className="max-w-56 text-xs text-navy-700">
                  <span className="line-clamp-3">{r.message || "—"}</span>
                </td>
                <td>
                  {r.prescriptionFileId ? (
                    <a href={`/api/files/${r.prescriptionFileId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <FileText className="size-3.5" /> View
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-xs whitespace-nowrap text-navy-700">{formatDateTime(r.createdAt)}</td>
                <td>
                  <RequestStatusBadge status={r.status} />
                </td>
                <td>
                  <button type="button" onClick={() => setEditing(r)} className="btn btn-outline btn-sm">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Request: ${editing.medicineName}` : "Request"}>
        {editing && (
          <ActionForm action={updateMedicineRequestAction} onSuccess={() => setEditing(null)} className="space-y-4">
            <input type="hidden" name="id" value={editing.id} />
            <p className="rounded-xl bg-surface p-3 text-sm text-navy-700">
              <strong>{editing.customerName}</strong> · {editing.phone} · {editing.email}
              {editing.message && <span className="mt-1 block">{editing.message}</span>}
            </p>
            <SelectField name="status" label="Status" defaultValue={editing.status}>
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REQUEST_STATUS_LABELS[s]}
                </option>
              ))}
            </SelectField>
            <TextArea name="adminNote" label="Note to customer" maxLength={1000} defaultValue={editing.adminNote} placeholder="e.g. Available from Friday at Rs. 450" hint="Shown to signed-in customers under Medicine Requests." />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
                Cancel
              </button>
              <SubmitButton>Save</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
