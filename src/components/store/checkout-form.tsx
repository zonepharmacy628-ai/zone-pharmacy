"use client";

import { Banknote, Briefcase, Check, FileText, Home, Landmark, LoaderCircle, Lock, MapPin, Plus, ShoppingCart, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { placeOrderAction } from "@/actions/shop";
import { ProductImage } from "@/components/brand";
import { ActionForm, CheckField, Field, FileField, SelectField, SubmitButton, TextArea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { ADDRESS_LABELS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import { cn, formatMoney } from "@/lib/utils";
import { lineProblem, OrderTotals } from "./cart-view";
import { useStore } from "./store-context";

export type SavedAddress = { id: number; label: string; fullName: string; phone: string; address: string; city: string; isDefault: boolean };
export type PaymentOptions = {
  cod: boolean;
  jazzcash: { title: string; number: string } | null;
  bank: { name: string; title: string; number: string; iban: string } | null;
};

const ICONS = { home: Home, office: Briefcase, other: MapPin } as const;

export function CheckoutForm({ addresses, payment }: { addresses: SavedAddress[]; payment: PaymentOptions }) {
  const { ready, loading, items, lines, clear, refresh, user, settings, total } = useStore();
  const router = useRouter();
  const initial = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<number | "new">(initial?.id ?? "new");
  const methods = (["cod", "jazzcash", "bank"] as PaymentMethod[]).filter((m) => (m === "cod" ? payment.cod : payment[m]));
  const [method, setMethod] = useState<PaymentMethod | undefined>(methods[0]);
  // One key per checkout attempt: a double submit can never create two orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  if (placed || !ready || (loading && lines.length === 0 && items.length > 0)) {
    return (
      <div className="card grid place-items-center py-24 text-brand-600" role="status" aria-label="Loading">
        <LoaderCircle className="size-8 animate-spin" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<ShoppingCart />}
          title="Your cart is empty"
          text="Add products to your cart before checking out."
          action={
            <Link href="/products" className="btn btn-primary">
              Browse Products
            </Link>
          }
        />
      </div>
    );
  }

  const selected = addressId === "new" ? undefined : addresses.find((a) => a.id === addressId);
  const blocked = lines.some(lineProblem) || lines.length !== items.length;
  const needsRx = lines.some((l) => l.product.requiresPrescription);
  const c = settings.currency;

  return (
    <ActionForm
      action={placeOrderAction}
      onSuccess={(res) => {
        if (!res.data) return;
        setPlaced(true);
        clear();
        router.replace(`/order/${res.data.orderNumber}?t=${res.data.token}`);
      }}
      className="grid gap-6 lg:grid-cols-[1fr_400px]"
    >
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="space-y-6">
        <section className="card p-5 sm:p-6" aria-labelledby="co-address">
          <h2 id="co-address" className="h-section mb-1 flex items-center gap-2">
            <MapPin className="size-5 text-brand-600" /> Delivery Details
          </h2>
          <p className="mb-5 text-sm text-navy-500">
            {user ? "Choose a saved address or enter a new one." : (
              <>
                Checking out as a guest.{" "}
                <Link href="/login?next=/checkout" className="font-semibold text-brand-600 hover:underline">
                  Sign in
                </Link>{" "}
                to use saved addresses and track orders in your account.
              </>
            )}
          </p>

          {addresses.length > 0 && (
            <div role="radiogroup" aria-label="Saved addresses" className="mb-5 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => {
                const Icon = ICONS[a.label as keyof typeof ICONS] ?? MapPin;
                const active = addressId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAddressId(a.id)}
                    className={cn("relative rounded-2xl border p-4 text-left transition", active ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-line hover:border-brand-300")}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-brand-600 text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                    <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                      <Icon className="size-4 text-brand-600" /> {ADDRESS_LABELS[a.label as keyof typeof ADDRESS_LABELS] ?? "Address"}
                      {a.isDefault && <span className="badge bg-brand-600 text-white">Default</span>}
                    </p>
                    <p className="mt-2 text-sm text-navy-700">{a.fullName}</p>
                    <p className="text-sm text-navy-500">
                      {a.address}, {a.city}
                    </p>
                    <p className="text-sm text-navy-500">{a.phone}</p>
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={addressId === "new"}
                onClick={() => setAddressId("new")}
                className={cn("flex min-h-24 items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-semibold transition", addressId === "new" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-brand-300 text-brand-600 hover:bg-brand-50")}
              >
                <Plus className="size-4" /> Add New Address
              </button>
            </div>
          )}

          {/* key forces the inputs to re-initialise when another saved address is chosen */}
          <div key={String(addressId)} className="grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label="Full Name" required autoComplete="name" maxLength={80} defaultValue={selected?.fullName ?? user?.name ?? ""} />
            <Field name="email" label="Email Address" type="email" required autoComplete="email" maxLength={160} defaultValue={user?.email ?? ""} hint="Order updates are sent here." />
            <Field name="phone" label="Mobile Number" type="tel" required autoComplete="tel" inputMode="tel" placeholder="0300 1234567" maxLength={18} defaultValue={selected?.phone ?? user?.phone ?? ""} />
            <Field name="city" label="City" required autoComplete="address-level2" maxLength={60} defaultValue={selected?.city ?? ""} />
            <TextArea name="address" label="Complete Address" required autoComplete="street-address" maxLength={300} placeholder="House / flat number, street, area" defaultValue={selected?.address ?? ""} wrapClassName="sm:col-span-2" />
            <TextArea name="notes" label="Delivery Notes (optional)" maxLength={500} placeholder="Landmark, preferred time, etc." wrapClassName="sm:col-span-2" rows={2} />
            {user && addressId === "new" && (
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <CheckField name="saveAddress" label="Save this address to my account" />
                <SelectField name="addressLabel" aria-label="Address type" defaultValue="home" className="w-auto">
                  <option value="home">Home</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </SelectField>
              </div>
            )}
          </div>
        </section>

        {needsRx && (
          <section className="card p-5 sm:p-6" aria-labelledby="co-rx">
            <h2 id="co-rx" className="h-section mb-1 flex items-center gap-2">
              <FileText className="size-5 text-brand-600" /> Prescription
            </h2>
            <p className="mb-4 text-sm text-navy-500">
              Your order contains prescription-only medicine ({lines.filter((l) => l.product.requiresPrescription).map((l) => l.product.name).join(", ")}). Upload a clear photo or
              scan. Only our pharmacist can view it.
            </p>
            <FileField name="prescription" label="Upload Prescription" required accept="image/jpeg,image/png,application/pdf" hint="PDF, JPG or PNG — max 4 MB" />
          </section>
        )}

        <section className="card p-5 sm:p-6" aria-labelledby="co-pay">
          <h2 id="co-pay" className="h-section mb-1 flex items-center gap-2">
            <Banknote className="size-5 text-brand-600" /> Payment Method
          </h2>
          <p className="mb-5 text-sm text-navy-500">Choose your preferred payment method.</p>
          {methods.length === 0 ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">Online ordering is temporarily unavailable. Please try again later.</p>
          ) : (
            <div className="space-y-3">
              {methods.map((m) => {
                const Icon = m === "cod" ? Banknote : m === "jazzcash" ? Smartphone : Landmark;
                const active = method === m;
                return (
                  <label key={m} className={cn("block cursor-pointer rounded-2xl border p-4 transition", active ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-line hover:border-brand-300")}>
                    <span className="flex items-center gap-4">
                      <input type="radio" name="paymentMethod" value={m} checked={active} onChange={() => setMethod(m)} className="size-4 accent-brand-600" />
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                        <Icon className="size-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-navy-900">{PAYMENT_METHOD_LABELS[m]}</span>
                        <span className="block text-xs text-navy-500">
                          {m === "cod" ? "Pay in cash when you receive your order" : m === "jazzcash" ? "Send payment to our JazzCash account" : "Transfer to our bank account"}
                        </span>
                      </span>
                    </span>
                    {active && m !== "cod" && (
                      <span className="mt-4 block border-t border-brand-200 pt-4">
                        <span className="mb-3 block text-sm text-navy-700">
                          Send <strong>{formatMoney(total, c)}</strong> to the account below, then enter the transaction ID. Your order is confirmed once we verify the payment.
                        </span>
                        <dl className="mb-4 grid gap-x-6 gap-y-1 rounded-xl bg-white p-4 text-sm sm:grid-cols-2">
                          {(m === "jazzcash" && payment.jazzcash
                            ? [
                                ["Account Title", payment.jazzcash.title],
                                ["JazzCash Number", payment.jazzcash.number],
                              ]
                            : payment.bank
                              ? [
                                  ["Bank Name", payment.bank.name],
                                  ["Account Title", payment.bank.title],
                                  ["Account Number", payment.bank.number],
                                  ["IBAN", payment.bank.iban],
                                ]
                              : []
                          )
                            .filter(([, v]) => v)
                            .map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-3 py-1 sm:block">
                                <dt className="text-xs text-navy-500">{k}</dt>
                                <dd className="font-semibold break-all text-navy-900 select-all">{v}</dd>
                              </div>
                            ))}
                        </dl>
                        <Field name="paymentReference" label="Transaction ID" required maxLength={60} placeholder="e.g. 0123456789" hint="Shown in your payment confirmation SMS or receipt." />
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <aside className="card self-start p-5 sm:p-6 lg:sticky lg:top-6">
        <h2 className="h-section mb-4">Order Summary</h2>
        <ul className="mb-4 max-h-80 divide-y divide-line overflow-y-auto">
          {lines.map((line) => {
            const problem = lineProblem(line);
            return (
              <li key={line.product.id} className="flex items-center gap-3 py-3">
                <ProductImage name={line.product.name} imageFileId={line.product.imageFileId} sizes="56px" className="w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy-900">{line.product.name}</p>
                  <p className={problem ? "text-xs font-semibold text-red-600" : "text-xs text-navy-500"}>{problem ?? `Qty: ${line.qty}`}</p>
                </div>
                <p className="text-sm font-bold">{formatMoney(line.lineTotal, c)}</p>
              </li>
            );
          })}
        </ul>
        <OrderTotals checkout />
        {blocked ? (
          <Link href="/cart" className="btn btn-outline mt-5 w-full">
            Fix items in cart
          </Link>
        ) : (
          <SubmitButton disabled={methods.length === 0} className="mt-5 w-full py-3.5 text-base">
            <Lock className="size-4" /> Place Order
          </SubmitButton>
        )}
        <p className="mt-3 text-center text-xs text-navy-500">Delivery in {settings.deliveryTime}. Prices are confirmed when the order is placed.</p>
        <Link href="/cart" className="mt-3 block text-center text-sm font-semibold text-brand-600 hover:underline">
          ← Back to Cart
        </Link>
      </aside>
    </ActionForm>
  );
}
