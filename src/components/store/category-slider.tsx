"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { CategoryIcon } from "@/components/brand";

type SliderCategory = { id: number; name: string; slug: string; icon: string };

/** "Shop by Category" carousel: same behaviour as the product sliders (swipe on touch, arrows on desktop). */
export function CategorySlider({ categories }: { categories: SliderCategory[] }) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  if (!categories.length) return null;
  const arrow = "hidden size-10 place-items-center rounded-full border border-line bg-white text-navy-800 shadow-sm hover:bg-brand-50 md:grid";

  return (
    <section aria-labelledby="shop-by-category" className="card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="shop-by-category" className="h-section">
          Shop by Category
        </h2>
        <div className="flex items-center gap-2">
          <Link href="/products" className="mr-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            View All →
          </Link>
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll categories left" className={arrow}>
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll categories right" className={arrow}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <ul ref={track} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 sm:mx-0 sm:px-0">
        {categories.map((c) => (
          <li key={c.id} className="w-[6.75rem] shrink-0 snap-start sm:w-[calc((100%-3rem)/5)] lg:w-[calc((100%-3.75rem)/6)] xl:w-[calc((100%-4.5rem)/7)]">
            <Link
              href={`/category/${c.slug}`}
              className="flex h-full flex-col items-center gap-3 rounded-2xl border border-line p-4 text-center transition hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                <CategoryIcon name={c.icon} className="size-6" />
              </span>
              <span className="text-xs leading-tight font-semibold text-navy-900 sm:text-sm">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
