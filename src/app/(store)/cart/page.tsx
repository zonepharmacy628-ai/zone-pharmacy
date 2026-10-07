import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";
import { Breadcrumbs } from "@/components/store/sections";

export const metadata: Metadata = { title: "Your Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-5 sm:py-8">
      <Breadcrumbs items={[{ label: "Cart" }]} />
      <div className="mb-5">
        <h1 className="h-page">Your Cart</h1>
        <p className="mt-1 text-sm text-navy-500">Review your items and proceed to checkout</p>
      </div>
      <CartView />
    </div>
  );
}
