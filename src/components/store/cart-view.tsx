"use client";

import { ArrowLeft, ArrowRight, FileText, LoaderCircle, Lock, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ProductImage } from "@/components/brand";
import { EmptyState } from "@/components/ui/misc";
import { MAX_CART_QTY } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { QtyStepper } from "./product-card";
import { useStore, type CartLine } from "./store-context";

export function lineProblem(line: CartLine) {
  const { product, qty } = line;
  if (!product.available) return "Currently unavailable — please remove";
  if (product.stock <= 0) return "Out of stock — please remove";
  if (qty > product.stock) return `Only ${product.stock} in stock — reduce quantity`;
  return null;
}

export function OrderTotals({ checkout }: { checkout?: boolean }) {
  const { settings, subtotal, deliveryCharge, total, count } = useStore();
  const c = settings.currency;
  const away = settings.freeDeliveryThreshold - subtotal;
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-navy-700">
          Subtotal ({count} item{count === 1 ? "" : "s"})
        </dt>
        <dd className="font-semibold">{formatMoney(subtotal, c)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-navy-700">Delivery Charges</dt>
        <dd className="font-semibold">{deliveryCharge === 0 ? <span className="text-emerald-700">Free</span> : formatMoney(deliveryCharge, c)}</dd>
      </div>
      {settings.freeDeliveryThreshold > 0 && deliveryCharge > 0 && away > 0 && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          Add {formatMoney(away, c)} more for free delivery.
        </p>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="text-base font-bold text-navy-900">{checkout ? "Total to Pay" : "Total"}</dt>
        <dd className="text-xl font-extrabold text-brand-700">{formatMoney(total, c)}</dd>
      </div>
    </dl>
  );
}

export function CartView() {
  const { ready, loading, items, lines, setQty, remove, clear, refresh, settings } = useStore();
  const c = settings.currency;

  // Re-check prices and stock every time the cart is opened.
  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  if (!ready || (loading && lines.length === 0 && items.length > 0)) {
    return (
      <div className="card grid place-items-center py-24 text-brand-600" role="status" aria-label="Loading cart">
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
          text="Browse our medicines and health products and add what you need."
          action={
            <Link href="/products" className="btn btn-primary">
              Start Shopping
            </Link>
          }
        />
      </div>
    );
  }

  const blocked = lines.some(lineProblem) || lines.length !== items.length;
  const needsRx = lines.some((l) => l.product.requiresPrescription);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card self-start">
        <div className="hidden grid-cols-[1fr_110px_140px_110px_40px] gap-4 border-b border-line px-6 py-4 text-xs font-semibold tracking-wide text-navy-500 uppercase md:grid">
          <span>Product</span>
          <span>Price</span>
          <span>Quantity</span>
          <span>Total</span>
          <span />
        </div>
        <ul className="divide-y divide-line">
          {lines.map((line) => {
            const { product, qty, lineTotal } = line;
            const problem = lineProblem(line);
            return (
              <li key={product.id} className="grid grid-cols-[72px_1fr] gap-x-4 gap-y-3 p-4 md:grid-cols-[1fr_110px_140px_110px_40px] md:items-center md:px-6">
                <div className="contents md:flex md:items-center md:gap-4">
                  <Link href={`/product/${product.slug}`} className="row-span-2 w-[72px] shrink-0 md:w-20">
                    <ProductImage name={product.name} imageFileId={product.imageFileId} sizes="80px" />
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/product/${product.slug}`} className="text-sm font-semibold text-navy-900 hover:text-brand-600">
                      {product.name}
                    </Link>
                    <p className="text-xs text-navy-500">{product.shortDescription}</p>
                    {product.requiresPrescription && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                        <FileText className="size-3" /> Prescription required
                      </p>
                    )}
                    <p className={problem ? "mt-1 text-xs font-semibold text-red-600" : "mt-1 text-xs font-medium text-emerald-700"}>{problem ?? "In Stock"}</p>
                    <p className="mt-1 text-sm font-semibold md:hidden">{formatMoney(product.price, c)}</p>
                  </div>
                </div>
                <p className="hidden text-sm font-semibold md:block">{formatMoney(product.price, c)}</p>
                <div className="col-start-2 flex items-center justify-between gap-3 md:contents">
                  <QtyStepper small value={qty} onChange={(n) => setQty(product.id, n)} max={Math.max(1, Math.min(product.stock, MAX_CART_QTY))} />
                  <p className="text-sm font-bold text-navy-900">{formatMoney(lineTotal, c)}</p>
                  <button type="button" onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`} className="rounded-lg p-2 text-navy-500 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="size-5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 md:px-6">
          <Link href="/products" className="btn btn-ghost btn-sm text-brand-700">
            <ArrowLeft className="size-4" /> Continue Shopping
          </Link>
          <button type="button" onClick={() => window.confirm("Remove all items from your cart?") && clear()} className="btn btn-ghost btn-sm">
            <Trash2 className="size-4" /> Clear Cart
          </button>
        </div>
      </div>

      <aside className="card self-start p-5 sm:p-6">
        <h2 className="h-section mb-4">Order Summary</h2>
        <OrderTotals />
        {needsRx && (
          <p className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <FileText className="size-4 shrink-0" /> Your cart has prescription-only medicine. You&apos;ll upload the prescription at checkout.
          </p>
        )}
        {blocked ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-700">Fix the highlighted items to continue.</p>
        ) : (
          <Link href="/checkout" className="btn btn-primary mt-5 w-full py-3.5 text-base">
            <Lock className="size-4" /> Proceed to Checkout <ArrowRight className="size-4" />
          </Link>
        )}
        <p className="mt-3 text-center text-xs text-navy-500">Delivery in {settings.deliveryTime}</p>
      </aside>
    </div>
  );
}
