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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 via-brand-50 to-white">
        <div className="grid items-center gap-4 p-6 sm:p-10 md:grid-cols-2 lg:p-14">
          <div className="relative z-10">
            {settings.heroBadge && <span className="badge mb-4 bg-white px-3 py-1 text-brand-700 shadow-sm">{settings.heroBadge}</span>}
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
              {settings.heroHeading} <span className="text-brand-600">{settings.heroHighlight}</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-navy-700 sm:text-lg">{settings.heroDescription}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-primary rounded-full px-6 py-3 text-base">
                Shop Now <ArrowRight className="size-4" />
              </Link>
              <Link href="/medicine-request" className="btn btn-outline rounded-full px-6 py-3 text-base">
                Request a Medicine
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-navy-700">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-brand-600" /> 100% Genuine Products
              </li>
              <li className="flex items-center gap-1.5">
                <Truck className="size-4 text-brand-600" /> Delivery in {settings.deliveryTime}
              </li>
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            {heroImage ? (
              <Image src={heroImage} alt="" width={640} height={460} unoptimized priority className="h-auto max-h-80 w-full rounded-2xl object-cover" />
            ) : (
              <HeroArt className="h-auto w-full" />
            )}
          </div>
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
        <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-8">
          {popularCategories.map((c) => (
            <li key={c.id} className="w-28 shrink-0 sm:w-auto">
              <Link
                href={`/category/${c.slug}`}
                className="flex h-full flex-col items-center gap-3 rounded-2xl border border-line p-4 text-center transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="grid size-14 place-items-center rounded-full bg-brand-100 text-brand-600">
                  <CategoryIcon name={c.icon} className="size-6" />
                </span>
                <span className="text-xs font-semibold text-navy-900 sm:text-sm">{c.name}</span>
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
