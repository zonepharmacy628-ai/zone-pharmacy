"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCategoryAction, deleteProductAction, saveCategoryAction, saveProductAction, toggleCategoryAction } from "@/actions/admin/catalog";
import { deleteSupplierAction, saveSupplierAction } from "@/actions/admin/inventory";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/brand";
import { ActionButton, ActionForm, CheckField, Field, FileField, SelectField, SubmitButton, TextArea } from "@/components/ui/form";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { fileUrl } from "@/lib/utils";

export type ProductFormValues = {
  id: number;
  name: string;
  genericName: string;
  brand: string;
  shortDescription: string;
  description: string;
  categoryId: number | null;
  price: number;
  comparePrice: number | null;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  available: boolean;
  requiresPrescription: boolean;
  featured: boolean;
  popular: boolean;
  expiryDate: string | null;
  imageFileId: string | null;
};

export function ProductForm({
  product,
  categories,
  canEditStock,
}: {
  product?: ProductFormValues;
  categories: { id: number; name: string }[];
  canEditStock: boolean;
}) {
  const router = useRouter();
  const image = fileUrl(product?.imageFileId);
  return (
    <ActionForm
      action={saveProductAction}
      onSuccess={() => {
        router.push("/admin/products");
        router.refresh();
      }}
      className="grid gap-6 xl:grid-cols-[1fr_360px]"
    >
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <div className="space-y-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <h2 className="h-section sm:col-span-2">Product Information</h2>
          <Field name="name" label="Product Name" required maxLength={120} defaultValue={product?.name ?? ""} wrapClassName="sm:col-span-2" />
          <Field name="genericName" label="Generic / Medicine Name" maxLength={120} defaultValue={product?.genericName ?? ""} placeholder="e.g. Paracetamol" />
          <Field name="brand" label="Brand" maxLength={80} defaultValue={product?.brand ?? ""} />
          <SelectField name="categoryId" label="Category" defaultValue={product?.categoryId ?? ""}>
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <Field name="shortDescription" label="Short Description" maxLength={160} defaultValue={product?.shortDescription ?? ""} placeholder="e.g. Pain Relief | 20 Tablets" />
          <TextArea name="description" label="Full Description" rows={6} maxLength={5000} defaultValue={product?.description ?? ""} wrapClassName="sm:col-span-2" />
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <h2 className="h-section sm:col-span-3">Pricing &amp; Stock</h2>
          <Field name="price" label="Sale Price (Rs.)" type="number" min={0} step="0.01" inputMode="decimal" required defaultValue={product?.price ?? ""} />
          <Field name="comparePrice" label="Original Price (Rs.)" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={product?.comparePrice ?? ""} hint="Optional. Shows a discount when higher than the sale price." />
          <Field name="costPrice" label="Purchase Cost (Rs.)" type="number" min={0} step="0.01" inputMode="decimal" required defaultValue={product?.costPrice ?? 0} hint="Used for gross profit. Updated by purchases." />
          <Field
            name="stock"
            label="Stock"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            required
            defaultValue={product?.stock ?? 0}
            readOnly={Boolean(product) && !canEditStock}
            hint={product && !canEditStock ? "You need the Manage Stock permission to change stock." : "Changes are recorded in stock history."}
          />
          <Field name="lowStockThreshold" label="Low-Stock Alert At" type="number" min={0} step="1" inputMode="numeric" required defaultValue={product?.lowStockThreshold ?? 10} />
          <Field name="expiryDate" label="Expiry Date" type="date" defaultValue={product?.expiryDate ?? ""} />
        </section>
      </div>

      <div className="space-y-6">
        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="h-section">Product Image</h2>
          {image && (
            <div className="relative aspect-square w-40 overflow-hidden rounded-xl border border-line bg-brand-50">
              <Image src={image} alt="Current product image" fill unoptimized sizes="160px" className="object-contain p-2" />
            </div>
          )}
          <FileField name="image" label={image ? "Replace Image" : "Upload Image"} accept="image/jpeg,image/png,image/webp" hint="JPG, PNG or WebP — max 4 MB. Square images look best." />
          {image && <CheckField name="removeImage" label="Remove current image" />}
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="h-section">Visibility</h2>
          <CheckField name="available" label="Available for sale" hint="Untick to stop selling without deleting the product." defaultChecked={product?.available ?? true} />
          <CheckField name="requiresPrescription" label="Prescription required" hint="Customers must upload a prescription at checkout." defaultChecked={product?.requiresPrescription ?? false} />
          <CheckField name="featured" label="Featured product" hint="Shown in Featured Products on the home page." defaultChecked={product?.featured ?? false} />
          <CheckField name="popular" label="Popular product" hint="Shown in Popular Products on the home page." defaultChecked={product?.popular ?? false} />
        </section>

        <div className="flex gap-3">
          <SubmitButton className="flex-1 py-3">{product ? "Save Changes" : "Add Product"}</SubmitButton>
          <button type="button" onClick={() => router.push("/admin/products")} className="btn btn-outline">
            Cancel
          </button>
        </div>
      </div>
    </ActionForm>
  );
}

export function DeleteProductButton({ id, name }: { id: number; name: string }) {
  return (
    <ActionButton
      action={() => deleteProductAction(id)}
      confirm={`Delete "${name}"? Past orders keep their record of it. This cannot be undone.`}
      aria-label={`Delete ${name}`}
      className="btn btn-danger btn-sm"
    >
      <Trash2 className="size-3.5" />
    </ActionButton>
  );
}

type Category = { id: number; name: string; slug: string; icon: string; active: boolean; sortOrder: number; productCount: number };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const current = editing && editing !== "new" ? editing : undefined;
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setEditing("new")} className="btn btn-primary">
          <Plus className="size-4" /> Add Category
        </button>
      </div>
      <div className="card">
        {categories.length === 0 ? (
          <EmptyState icon={<Plus />} title="No categories yet" text="Add your first category to organise products." />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Products</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="flex items-center gap-3 font-semibold text-navy-900">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                          <CategoryIcon name={c.icon} className="size-4" />
                        </span>
                        {c.name}
                      </span>
                    </td>
                    <td>{c.productCount}</td>
                    <td>{c.sortOrder}</td>
                    <td>{c.active ? <Badge tone="green">Enabled</Badge> : <Badge tone="gray">Disabled</Badge>}</td>
                    <td>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditing(c)} className="btn btn-outline btn-sm">
                          <Pencil className="size-3.5" /> Edit
                        </button>
                        <ActionButton action={() => toggleCategoryAction(c.id, !c.active)} className="btn btn-outline btn-sm">
                          {c.active ? "Disable" : "Enable"}
                        </ActionButton>
                        <ActionButton
                          action={() => deleteCategoryAction(c.id)}
                          confirm={`Delete "${c.name}"? Its ${c.productCount} product(s) will become uncategorised.`}
                          aria-label={`Delete ${c.name}`}
                          className="btn btn-danger btn-sm"
                        >
                          <Trash2 className="size-3.5" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={current ? "Edit Category" : "Add Category"}>
        <ActionForm action={saveCategoryAction} onSuccess={() => setEditing(null)} className="space-y-4">
          <input type="hidden" name="id" value={current?.id ?? ""} />
          <Field name="name" label="Category Name" required maxLength={60} defaultValue={current?.name ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField name="icon" label="Icon" defaultValue={current?.icon ?? "pill"}>
              {Object.keys(CATEGORY_ICONS).map((key) => (
                <option key={key} value={key}>
                  {key[0].toUpperCase() + key.slice(1)}
                </option>
              ))}
            </SelectField>
            <Field name="sortOrder" label="Display Order" type="number" min={0} max={9999} required defaultValue={current?.sortOrder ?? categories.length} />
          </div>
          <CheckField name="active" label="Enabled" hint="Disabled categories and their products are hidden from the website." defaultChecked={current?.active ?? true} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
              Cancel
            </button>
            <SubmitButton>Save Category</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}

type Supplier = { id: number; name: string; company: string; phone: string; address: string; email: string };

export function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const current = editing && editing !== "new" ? editing : undefined;
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setEditing("new")} className="btn btn-primary">
          <Plus className="size-4" /> Add Supplier
        </button>
      </div>
      <div className="card">
        {suppliers.length === 0 ? (
          <EmptyState icon={<Plus />} title="No suppliers yet" text="Add a supplier before recording your first purchase." />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold text-navy-900">{s.name}</td>
                    <td>{s.company || "—"}</td>
                    <td className="whitespace-nowrap">{s.phone || "—"}</td>
                    <td>{s.email || "—"}</td>
                    <td className="max-w-64 text-navy-700">{s.address || "—"}</td>
                    <td>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditing(s)} className="btn btn-outline btn-sm">
                          <Pencil className="size-3.5" /> Edit
                        </button>
                        <ActionButton action={() => deleteSupplierAction(s.id)} confirm={`Delete supplier "${s.name}"?`} aria-label={`Delete ${s.name}`} className="btn btn-danger btn-sm">
                          <Trash2 className="size-3.5" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={current ? "Edit Supplier" : "Add Supplier"}>
        <ActionForm action={saveSupplierAction} onSuccess={() => setEditing(null)} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={current?.id ?? ""} />
          <Field name="name" label="Supplier Name" required maxLength={100} defaultValue={current?.name ?? ""} />
          <Field name="company" label="Company Name" maxLength={120} defaultValue={current?.company ?? ""} />
          <Field name="phone" label="Phone" type="tel" maxLength={18} defaultValue={current?.phone ?? ""} />
          <Field name="email" label="Email" type="email" maxLength={160} defaultValue={current?.email ?? ""} />
          <TextArea name="address" label="Address" maxLength={300} defaultValue={current?.address ?? ""} wrapClassName="sm:col-span-2" />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
              Cancel
            </button>
            <SubmitButton>Save Supplier</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}
