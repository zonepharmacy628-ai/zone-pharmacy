import { ArrowRight, ClipboardPlus, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CategoryIcon } from "@/components/brand";
import { ProductSlider } from "@/components/store/product-card";
import { HeroArt, TrustBar } from "@/components/store/sections";
import { getActiveCategories, productSection } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/utils";

export default async function HomePage() {
  const [settings, categories, featured, popular, fresh] = await Promise.all([
    getSettings(),
    getActiveCategories(),
    productSection("featured"),
    productSection("popular"),
    productSection("new"),
  ]);
  const chosen = categories.filter((c) => settings.popularCategoryIds.includes(c.id));
  const popularCategories = (chosen.length ? chosen : categories).slice(0, 8);
  const heroImage = fileUrl(settings.heroImageFileId);

  return (
    <div className="container-page space-y-8 py-4 sm:space-y-10 sm:py-6">
      {/* Hero banner: copy on the left, pharmacy visual filling the right edge at every screen size. */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-100 via-brand-50 to-white shadow-card">
        {/* The mask fades the visual into the copy side instead of ending on a hard edge. */}
        <div
          className="absolute inset-y-0 right-0 -z-10 w-[42%] sm:w-[46%] lg:w-1/2"
          style={{ maskImage: "linear-gradient(to right, transparent, #000 42%)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 42%)" }}
        >
          {heroImage ? (
            <Image src={heroImage} alt="" fill unoptimized priority sizes="(max-width: 1024px) 46vw, 660px" className="object-cover" />
          ) : (
            <HeroArt className="size-full" />
          )}
        </div>

        <div className="flex w-[62%] flex-col justify-center py-5 pl-5 sm:min-h-[21rem] sm:w-[56%] sm:py-8 sm:pl-10 lg:min-h-[30rem] lg:w-1/2 lg:py-14 lg:pl-14">
          {settings.heroBadge && (
            <span className="badge mb-2.5 self-start bg-white px-3 py-1 whitespace-normal text-brand-700 shadow-sm sm:mb-4">{settings.heroBadge}</span>
          )}
          <h1 className="text-2xl leading-[1.12] font-extrabold tracking-tight text-navy-900 sm:text-4xl lg:text-[3.4rem]">
            {settings.heroHeading} <span className="text-brand-600">{settings.heroHighlight}</span>
          </h1>
          <p className="mt-2 max-w-md text-[13px]/[1.4] text-navy-700 sm:mt-4 sm:text-base lg:text-lg">{settings.heroDescription}</p>
          <div className="mt-4 flex max-w-xs flex-col gap-2 sm:mt-6 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-3">
            <Link href="/products" className="btn btn-primary justify-between rounded-xl px-4 py-2.5 text-sm shadow-md sm:px-5 sm:py-3 sm:text-base lg:justify-center lg:px-7 lg:py-3.5">
              Shop Now <ArrowRight className="size-4" />
            </Link>
            <Link href="/medicine-request" className="btn btn-outline justify-between rounded-xl px-4 py-2.5 text-sm sm:px-5 sm:py-3 sm:text-base lg:justify-center lg:px-7 lg:py-3.5">
              Request a Medicine <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="mt-6 hidden flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-navy-700 sm:flex">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 shrink-0 text-brand-600" /> 100% Genuine Products
            </li>
            <li className="flex items-center gap-1.5">
              <Truck className="size-4 shrink-0 text-brand-600" /> Delivery in {settings.deliveryTime}
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="shop-by-category" className="card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shop-by-category" className="h-section">
            Shop by Category
          </h2>
          <Link href="/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View All →
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
          {popularCategories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/category/${c.slug}`}
                className="flex h-full items-center gap-2.5 rounded-2xl border border-line p-2.5 transition hover:border-brand-300 hover:bg-brand-50 sm:flex-col sm:gap-3 sm:p-4 sm:text-center"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600 sm:size-14">
                  <CategoryIcon name={c.icon} className="size-5 sm:size-6" />
                </span>
                <span className="min-w-0 text-xs leading-tight font-semibold text-navy-900 sm:text-sm">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <TrustBar />

      <ProductSlider title="Featured Products" products={featured} href="/products" />
      <ProductSlider title="Popular Products" products={popular} href="/products?sort=popular" />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white sm:p-10">
        <div className="relative z-10 max-w-xl">
          <span className="badge mb-3 bg-white/20 px-3 py-1 text-white">Medicine Not Found?</span>
          <h2 className="text-2xl font-extrabold sm:text-3xl">Request It — We&apos;ll Find It for You</h2>
          <p className="mt-2 text-sm text-white/85 sm:text-base">
            Tell us the medicine you need and our pharmacist will check availability with our suppliers and get back to you.
          </p>
          <Link href="/medicine-request" className="btn mt-5 rounded-full bg-white px-6 py-3 text-brand-700 hover:bg-brand-50">
            <ClipboardPlus className="size-4" /> Request a Medicine
          </Link>
        </div>
        <ClipboardPlus className="absolute -right-6 -bottom-8 size-48 text-white/10 sm:size-64" aria-hidden="true" />
      </section>

      <ProductSlider title="New Products" products={fresh} href="/products?sort=newest" />
    </div>
  );
}
