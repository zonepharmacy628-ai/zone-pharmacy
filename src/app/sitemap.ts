import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getActiveCategories, visible } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const db = await getDb();
  const [cats, prods] = await Promise.all([
    getActiveCategories(),
    db
      .select({ slug: products.slug, createdAt: products.createdAt })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(visible)
      .limit(5000),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/medicine-request`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/track`, changeFrequency: "monthly", priority: 0.3 },
    ...cats.map((c) => ({ url: `${base}/category/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...prods.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
