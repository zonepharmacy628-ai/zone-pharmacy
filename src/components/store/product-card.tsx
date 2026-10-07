"use client";

import { ChevronLeft, ChevronRight, FileText, Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { ProductImage } from "@/components/brand";
import type { ProductCardData } from "@/lib/catalog";
import { cn, discountPercent, formatMoney } from "@/lib/utils";
import { useStore } from "./store-context";

export function WishlistButton({ productId, className, withLabel }: { productId: number; className?: string; withLabel?: boolean }) {
  const { wishlistIds, toggleWishlist } = useStore();
  const active = wishlistIds.has(productId);
  return (
    <button
      type="button"
      onClick={() => toggleWishlist(productId)}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={cn("inline-flex items-center gap-2 text-sm font-medium text-navy-700 transition hover:text-brand-600", className)}
    >
      <Heart className={cn("size-5", active && "fill-brand-600 text-brand-600")} />
      {withLabel && (active ? "In Wishlist" : "Add to Wishlist")}
    </button>
  );
}

export function AddToCartButton({ product, qty = 1, className, small }: { product: ProductCardData; qty?: number; className?: string; small?: boolean }) {
  const { addToCart } = useStore();
  const buyable = product.available && product.stock > 0;
  return (
    <button
      type="button"
      disabled={!buyable}
      onClick={() => addToCart(product, qty)}
      className={cn("btn btn-primary w-full", small && "btn-sm", className)}
    >
      <ShoppingCart className="size-4" />
      {buyable ? "Add to Cart" : product.available ? "Out of Stock" : "Unavailable"}
    </button>
  );
}

export function QtyStepper({ value, onChange, max, min = 1, small }: { value: number; onChange: (n: number) => void; max: number; min?: number; small?: boolean }) {
  const btn = cn("grid place-items-center text-navy-700 hover:bg-brand-50 disabled:opacity-40", small ? "size-8" : "size-10");
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-line bg-white">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="size-4" />
      </button>
      <span className={cn("text-center text-sm font-semibold tabular-nums", small ? "w-8" : "w-10")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const { settings } = useStore();
  const off = discountPercent(product.price, product.comparePrice);
  const out = !product.available || product.stock <= 0;
  return (
    <article className="card group relative flex h-full flex-col p-3 transition hover:border-brand-300 sm:p-4">
      <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1 sm:top-4 sm:left-4">
        {off > 0 && <span className="badge bg-emerald-600 text-white">{off}% OFF</span>}
        {product.requiresPrescription && (
          <span className="badge bg-navy-800 text-white" title="Prescription required">
            <FileText className="size-3" /> Rx
          </span>
        )}
      </div>
      <WishlistButton productId={product.id} className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-1.5 shadow-sm sm:top-4 sm:right-4" />
      <Link href={`/product/${product.slug}`} className="block" tabIndex={-1} aria-hidden="true">
        <ProductImage name={product.name} imageFileId={product.imageFileId} priority={priority} className={cn(out && "opacity-60")} />
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-semibold text-navy-900">
          <Link href={`/product/${product.slug}`} className="hover:text-brand-600">
            {product.name}
          </Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-navy-500">{product.shortDescription || product.categoryName || product.brand}</p>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-navy-500">
          {product.ratingCount > 0 ? (
            <>
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-navy-800">{product.ratingAvg.toFixed(1)}</span>
              <span>({product.ratingCount})</span>
            </>
          ) : (
            <span className={out ? "font-medium text-red-600" : "font-medium text-emerald-700"}>
              {!product.available ? "Unavailable" : product.stock <= 0 ? "Out of stock" : "In stock"}
            </span>
          )}
        </div>
        <p className="mt-2 mb-3 flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold text-brand-700">{formatMoney(product.price, settings.currency)}</span>
          {off > 0 && <span className="text-xs text-navy-400 line-through">{formatMoney(product.comparePrice!, settings.currency)}</span>}
        </p>
        <AddToCartButton product={product} small className="mt-auto" />
      </div>
    </article>
  );
}

/** Horizontal product carousel: arrows on desktop, touch/swipe scrolling on mobile. */
export function ProductSlider({ products, title, href }: { products: ProductCardData[]; title: string; href?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  if (!products.length) return null;
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="h-section">{title}</h2>
        <div className="flex items-center gap-2">
          {href && (
            <Link href={href} className="mr-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              View All →
            </Link>
          )}
          <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className="hidden size-9 place-items-center rounded-full border border-line bg-white text-navy-800 shadow-sm hover:bg-brand-50 md:grid">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className="hidden size-9 place-items-center rounded-full border border-line bg-white text-navy-800 shadow-sm hover:bg-brand-50 md:grid">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <div ref={track} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
        {products.map((p, i) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23.5%] xl:w-[15.6%]">
            <ProductCard product={p} priority={i < 2} />
          </div>
        ))}
      </div>
    </section>
  );
}
