"use client";

import { ShoppingCart, Star, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitReviewAction } from "@/actions/account";
import { ActionForm, SubmitButton, TextArea, useFormState } from "@/components/ui/form";
import type { ProductCardData } from "@/lib/catalog";
import { MAX_CART_QTY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { QtyStepper, WishlistButton } from "./product-card";
import { useStore } from "./store-context";

export function BuyBox({ product }: { product: ProductCardData }) {
  const { addToCart, items } = useStore();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const buyable = product.available && product.stock > 0;
  const max = Math.max(1, Math.min(product.stock, MAX_CART_QTY));
  const inCart = items.find((i) => i.id === product.id)?.qty ?? 0;

  return (
    <div className="mt-6">
      <p className="text-sm">
        <span className="font-semibold text-navy-900">Availability: </span>
        {!product.available ? (
          <span className="font-semibold text-red-600">Currently unavailable</span>
        ) : product.stock <= 0 ? (
          <span className="font-semibold text-red-600">Out of stock</span>
        ) : product.stock <= 10 ? (
          <span className="font-semibold text-amber-600">Only {product.stock} left in stock</span>
        ) : (
          <span className="font-semibold text-emerald-700">In stock ({product.stock} available)</span>
        )}
      </p>

      {buyable && (
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm font-semibold text-navy-900">Quantity:</span>
          <QtyStepper value={Math.min(qty, max)} onChange={setQty} max={max} />
          {inCart > 0 && <span className="text-xs text-navy-500">{inCart} already in cart</span>}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" disabled={!buyable} onClick={() => addToCart(product, Math.min(qty, max))} className="btn btn-primary py-3.5 text-base">
          <ShoppingCart className="size-5" /> {buyable ? "Add to Cart" : "Unavailable"}
        </button>
        <button
          type="button"
          disabled={!buyable}
          onClick={() => {
            if (inCart === 0) addToCart(product, Math.min(qty, max));
            router.push("/cart");
          }}
          className="btn btn-outline py-3.5 text-base"
        >
          <Zap className="size-5" /> Buy Now
        </button>
      </div>
      <WishlistButton productId={product.id} withLabel className="mt-3 py-2.5" />
    </div>
  );
}

function RatingInput({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  const [hover, setHover] = useState(0);
  const { errors } = useFormState();
  return (
    <fieldset>
      <legend className="label">Your rating</legend>
      <input type="hidden" name="rating" value={value || ""} />
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setValue(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={value === n}>
            <Star className={cn("size-8 transition", n <= (hover || value) ? "fill-amber-400 text-amber-400" : "fill-white text-slate-300")} />
          </button>
        ))}
      </div>
      {errors.rating && <p className="mt-1 text-xs font-medium text-red-600">{errors.rating}</p>}
    </fieldset>
  );
}

export function ReviewForm({ productId, rating = 0, comment = "" }: { productId: number; rating?: number; comment?: string }) {
  return (
    <ActionForm action={submitReviewAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <RatingInput initial={rating} />
      <TextArea name="comment" label="Your review (optional)" defaultValue={comment} maxLength={1000} placeholder="How was the product?" />
      <SubmitButton className="w-full">Submit Review</SubmitButton>
    </ActionForm>
  );
}
