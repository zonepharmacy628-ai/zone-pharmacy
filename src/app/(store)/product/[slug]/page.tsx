import { and, desc, eq } from "drizzle-orm";
import { FileText, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductImage } from "@/components/brand";
import { ProductSlider } from "@/components/store/product-card";
import { BuyBox, ReviewForm } from "@/components/store/product-detail";
import { Breadcrumbs, TrustList } from "@/components/store/sections";
import { Badge, Stars } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth";
import { relatedProducts, visible, type ProductCardData } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { categories, products, reviews, users } from "@/lib/db/schema";
import { canReview } from "@/lib/reviews";
import { getSettings } from "@/lib/settings";
import { discountPercent, fileUrl, formatDate, formatMoney } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

const getProduct = cache(async (slug: string) => {
  const db = await getDb();
  const [row] = await db
    .select({ product: products, categoryName: categories.name, categorySlug: categories.slug })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), visible));
  return row;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getProduct((await params).slug);
  if (!row) return { title: "Product not found" };
  const p = row.product;
  const description = (p.description || p.shortDescription || p.name).slice(0, 160);
  const image = fileUrl(p.imageFileId);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description, type: "website", images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const row = await getProduct((await params).slug);
  if (!row) notFound();
  const p = row.product;
  const db = await getDb();
  const [settings, user, related, productReviews] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    relatedProducts(p.id, p.categoryId),
    db
      .select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, userId: reviews.userId, author: users.name })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, p.id))
      .orderBy(desc(reviews.createdAt))
      .limit(50),
  ]);
  const mayReview = user ? await canReview(user.id, p.id) : false;
  const mine = user ? productReviews.find((r) => r.userId === user.id) : undefined;
  const off = discountPercent(p.price, p.comparePrice);
  // Only public card fields cross to the client; cost price and other internals stay on the server.
  const card: ProductCardData = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    shortDescription: p.shortDescription,
    price: p.price,
    comparePrice: p.comparePrice,
    stock: p.stock,
    available: p.available,
    requiresPrescription: p.requiresPrescription,
    imageFileId: p.imageFileId,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    categoryName: row.categoryName,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || p.shortDescription,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "PKR",
      availability: p.available && p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    aggregateRating: p.ratingCount ? { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount } : undefined,
  };

  return (
    <div className="container-page py-5 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs
        items={[
          ...(row.categoryName && row.categorySlug ? [{ label: row.categoryName, href: `/category/${row.categorySlug}` }] : []),
          { label: p.name },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_minmax(0,3.5fr)]">
        <div className="card self-start p-4">
          <ProductImage name={p.name} imageFileId={p.imageFileId} priority sizes="(max-width: 1024px) 100vw, 480px" />
          <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 rounded-xl bg-brand-50 p-3 text-xs font-medium text-navy-700">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-brand-600" /> 100% Original
            </li>
            <li className="flex items-center gap-1.5">
              <Truck className="size-4 text-brand-600" /> Delivery in {settings.deliveryTime}
            </li>
          </ul>
        </div>

        <div className="card self-start p-5 sm:p-7">
          <div className="mb-2 flex flex-wrap gap-2">
            {p.popular && <Badge>Best Seller</Badge>}
            {p.requiresPrescription && (
              <Badge tone="amber">
                <FileText className="size-3" /> Prescription Required
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{p.name}</h1>
          <p className="mt-1 text-sm text-navy-500">
            {[p.brand && `Brand: ${p.brand}`, p.genericName && `Generic: ${p.genericName}`, p.shortDescription].filter(Boolean).join(" · ")}
          </p>
          <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-navy-500 hover:text-brand-600">
            <Stars value={p.ratingAvg} />
            {p.ratingCount > 0 ? (
              <>
                <span className="font-semibold text-navy-900">{p.ratingAvg.toFixed(1)}</span> ({p.ratingCount} review{p.ratingCount === 1 ? "" : "s"})
              </>
            ) : (
              "No reviews yet"
            )}
          </a>
          <p className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-extrabold text-brand-700">{formatMoney(p.price, settings.currency)}</span>
            {off > 0 && (
              <>
                <span className="text-base text-navy-400 line-through">{formatMoney(p.comparePrice!, settings.currency)}</span>
                <span className="badge bg-brand-600 text-white">{off}% OFF</span>
              </>
            )}
          </p>

          {p.requiresPrescription && (
            <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <FileText className="mt-0.5 size-5 shrink-0" />
              <p>
                <strong>This medicine requires a valid prescription.</strong> You will be asked to upload it at checkout. Our pharmacist verifies
                every prescription before the order is dispatched.
              </p>
            </div>
          )}

          <BuyBox product={card} />
        </div>

        <div className="space-y-4 self-start md:col-span-2 lg:col-span-1">
          <TrustList />
        </div>
      </div>

      <section className="card mt-6 p-5 sm:p-7" aria-labelledby="about-product">
        <h2 id="about-product" className="h-section mb-3">
          Product Details
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed whitespace-pre-line text-navy-700">{p.description || "No description has been added for this product yet."}</p>
        <dl className="mt-5 grid max-w-3xl gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["Brand", p.brand],
            ["Generic name", p.genericName],
            ["Category", row.categoryName],
            ["Prescription", p.requiresPrescription ? "Required" : "Not required"],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-2">
                <dt className="text-navy-500">{k}</dt>
                <dd className="text-right font-semibold text-navy-900">{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      <section id="reviews" className="card mt-6 scroll-mt-6 p-5 sm:p-7" aria-labelledby="reviews-title">
        <h2 id="reviews-title" className="h-section mb-4">
          Ratings &amp; Reviews {p.ratingCount > 0 && <span className="text-navy-400">({p.ratingCount})</span>}
        </h2>
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            {productReviews.length === 0 ? (
              <p className="rounded-xl bg-surface p-6 text-center text-sm text-navy-500">No reviews yet. Customers can review this product after their order is delivered.</p>
            ) : (
              <ul className="divide-y divide-line">
                {productReviews.map((r) => (
                  <li key={r.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-navy-900">
                        {r.author} <span className="ml-1 text-xs font-medium text-emerald-700">Verified purchase</span>
                      </p>
                      <time className="text-xs text-navy-400" dateTime={r.createdAt.toISOString()}>
                        {formatDate(r.createdAt)}
                      </time>
                    </div>
                    <Stars value={r.rating} className="mt-1" />
                    {r.comment && <p className="mt-2 text-sm whitespace-pre-line text-navy-700">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl bg-surface p-5">
            <h3 className="mb-3 text-base font-bold text-navy-900">{mine ? "Update Your Review" : "Write a Review"}</h3>
            {!user ? (
              <p className="text-sm text-navy-500">
                <Link href={`/login?next=/product/${p.slug}`} className="font-semibold text-brand-600 hover:underline">
                  Sign in
                </Link>{" "}
                to review products you have purchased.
              </p>
            ) : mayReview ? (
              <ReviewForm productId={p.id} rating={mine?.rating} comment={mine?.comment} />
            ) : (
              <p className="text-sm text-navy-500">You can rate and review this product once an order containing it has been delivered to you.</p>
            )}
          </div>
        </div>
      </section>

      <div className="mt-8">
        <ProductSlider title="Related Products" products={related} href={row.categorySlug ? `/category/${row.categorySlug}` : "/products"} />
      </div>
    </div>
  );
}
