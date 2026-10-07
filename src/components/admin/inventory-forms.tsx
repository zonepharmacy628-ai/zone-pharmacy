"use client";

import { LoaderCircle, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { adjustStockAction, createPurchaseAction } from "@/actions/admin/inventory";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatMoney, round2 } from "@/lib/utils";

export function StockAdjustButton({ productId, name, stock }: { productId: number; name: string; stock: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline btn-sm">
        <SlidersHorizontal className="size-3.5" /> Adjust
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Adjust Stock">
        <p className="mb-4 text-sm text-navy-700">
          <strong>{name}</strong> — current stock: <strong>{stock}</strong>
        </p>
        <ActionForm action={adjustStockAction} onSuccess={() => setOpen(false)} className="space-y-4">
          <input type="hidden" name="productId" value={productId} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField name="mode" label="Adjustment" defaultValue="add">
              <option value="add">Add to stock</option>
              <option value="remove">Remove from stock</option>
              <option value="set">Set exact quantity</option>
            </SelectField>
            <Field name="quantity" label="Quantity" type="number" min={0} step="1" inputMode="numeric" required />
          </div>
          <Field name="note" label="Reason" required maxLength={200} placeholder="e.g. Damaged, stock count correction" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              Cancel
            </button>
            <SubmitButton>Update Stock</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}

type ProductOption = { id: number; name: string; stock: number; price: number; costPrice: number };
type Line = { key: number; productId: string; batchNumber: string; expiryDate: string; quantity: string; purchasePrice: string; salePrice: string };

const emptyLine = (key: number): Line => ({ key, productId: "", batchNumber: "", expiryDate: "", quantity: "", purchasePrice: "", salePrice: "" });

export function PurchaseForm({
  suppliers,
  products,
  today,
  currency,
}: {
  suppliers: { id: number; name: string; company: string }[];
  products: ProductOption[];
  today: string;
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [supplierId, setSupplierId] = useState("");
  const [invoice, setInvoice] = useState("");
  const [date, setDate] = useState(today);
  const [tax, setTax] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [nextKey, setNextKey] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const byId = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const subtotal = round2(lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.purchasePrice) || 0), 0));
  const total = round2(subtotal + (Number(tax) || 0));

  const submit = () => {
    if (pending) return;
    start(async () => {
      const res = await createPurchaseAction({
        supplierId,
        supplierInvoiceNumber: invoice,
        purchaseDate: date,
        tax: tax || 0,
        items: lines.map(({ productId, batchNumber, expiryDate, quantity, purchasePrice, salePrice }) => ({ productId, batchNumber, expiryDate, quantity, purchasePrice, salePrice })),
      }).catch(() => ({ ok: false as const, message: "Something went wrong. Please try again.", errors: undefined, data: undefined }));
      if (res.ok && res.data) {
        toast.success(res.message ?? "Purchase saved.");
        router.push(`/admin/purchases/${res.data.id}`);
        router.refresh();
      } else {
        setErrors(res.errors ?? {});
        toast.error(res.message ?? "Could not save the purchase.");
      }
    });
  };

  const err = (key: string) => errors[key] && <p className="mt-1 text-xs font-medium text-red-600">{errors[key]}</p>;

  if (suppliers.length === 0 || products.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-bold text-navy-900">{suppliers.length === 0 ? "Add a supplier first" : "Add a product first"}</p>
        <p className="mt-1 text-sm text-navy-500">A purchase needs at least one supplier and one product.</p>
        <Link href={suppliers.length === 0 ? "/admin/suppliers" : "/admin/products/new"} className="btn btn-primary mt-5">
          {suppliers.length === 0 ? "Go to Suppliers" : "Add Product"}
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6"
    >
      <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        <div>
          <label htmlFor="pu-supplier" className="label">
            Supplier Name <span className="text-brand-600">*</span>
          </label>
          <select id="pu-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input">
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.company ? ` — ${s.company}` : ""}
              </option>
            ))}
          </select>
          {err("supplierId")}
        </div>
        <div>
          <label htmlFor="pu-invoice" className="label">
            Supplier Invoice Number <span className="text-brand-600">*</span>
          </label>
          <input id="pu-invoice" value={invoice} onChange={(e) => setInvoice(e.target.value)} maxLength={60} className="input" />
          {err("supplierInvoiceNumber")}
        </div>
        <div>
          <label htmlFor="pu-date" className="label">
            Purchase Date <span className="text-brand-600">*</span>
          </label>
          <input id="pu-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="input" />
          {err("purchaseDate")}
        </div>
        <div>
          <label htmlFor="pu-tax" className="label">
            Tax ({currency}) <span className="font-normal text-navy-500">if applicable</span>
          </label>
          <input id="pu-tax" type="number" min={0} step="0.01" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0" className="input" />
          {err("tax")}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="h-section mb-4">Products / Medicines</h2>
        {errors.items && <p className="mb-3 text-sm font-medium text-red-600">{errors.items}</p>}
        <ul className="space-y-4">
          {lines.map((l, index) => {
            const product = byId.get(l.productId);
            const qty = Number(l.quantity) || 0;
            const e = (field: string) => errors[`items.${index}.${field}`];
            return (
              <li key={l.key} className="rounded-2xl border border-line p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_0.8fr_1fr_1fr_auto]">
                  <div>
                    <label htmlFor={`pu-p-${l.key}`} className="label">
                      Product
                    </label>
                    <select
                      id={`pu-p-${l.key}`}
                      value={l.productId}
                      onChange={(ev) => {
                        const chosen = byId.get(ev.target.value);
                        update(l.key, {
                          productId: ev.target.value,
                          purchasePrice: chosen && !l.purchasePrice ? String(chosen.costPrice || "") : l.purchasePrice,
                          salePrice: chosen && !l.salePrice ? String(chosen.price) : l.salePrice,
                        });
                      }}
                      className="input"
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {e("productId") && <p className="mt-1 text-xs font-medium text-red-600">Select a product</p>}
                  </div>
                  {(
                    [
                      ["batchNumber", "Batch Number", "text"],
                      ["expiryDate", "Expiry Date", "date"],
                      ["quantity", "Quantity", "number"],
                      ["purchasePrice", "Purchase Price", "number"],
                      ["salePrice", "Sale Price", "number"],
                    ] as const
                  ).map(([field, label, type]) => (
                    <div key={field}>
                      <label htmlFor={`pu-${field}-${l.key}`} className="label">
                        {label}
                      </label>
                      <input
                        id={`pu-${field}-${l.key}`}
                        type={type}
                        min={type === "number" ? 0 : field === "expiryDate" ? today : undefined}
                        step={field === "quantity" ? "1" : type === "number" ? "0.01" : undefined}
                        inputMode={field === "quantity" ? "numeric" : type === "number" ? "decimal" : undefined}
                        maxLength={type === "text" ? 60 : undefined}
                        value={l[field]}
                        onChange={(ev) => update(l.key, { [field]: ev.target.value })}
                        className="input"
                      />
                      {e(field) && <p className="mt-1 text-xs font-medium text-red-600">{e(field)}</p>}
                    </div>
                  ))}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
                      disabled={lines.length === 1}
                      aria-label="Remove line"
                      className="btn btn-danger px-3"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                {product && (
                  <p className="mt-3 text-xs text-navy-500">
                    Current stock: <strong className="text-navy-900">{product.stock}</strong>
                    {qty > 0 && (
                      <>
                        {" "}
                        + {qty} = new stock <strong className="text-emerald-700">{product.stock + qty}</strong>
                      </>
                    )}
                    {" · "}Line total: <strong className="text-navy-900">{formatMoney(round2(qty * (Number(l.purchasePrice) || 0)), currency)}</strong>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            setLines((ls) => [...ls, emptyLine(nextKey)]);
            setNextKey((k) => k + 1);
          }}
          className="btn btn-outline mt-4"
        >
          <Plus className="size-4" /> Add Another Product
        </button>
      </section>

      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <dl className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <dt className="text-navy-500">Subtotal</dt>
            <dd className="font-bold text-navy-900">{formatMoney(subtotal, currency)}</dd>
          </div>
          <div>
            <dt className="text-navy-500">Tax</dt>
            <dd className="font-bold text-navy-900">{formatMoney(Number(tax) || 0, currency)}</dd>
          </div>
          <div>
            <dt className="text-navy-500">Total Amount</dt>
            <dd className="text-lg font-extrabold text-brand-700">{formatMoney(total, currency)}</dd>
          </div>
        </dl>
        <button type="submit" disabled={pending} className="btn btn-primary px-8 py-3">
          {pending && <LoaderCircle className="size-4 animate-spin" />} Save Purchase
        </button>
      </section>
    </form>
  );
}
