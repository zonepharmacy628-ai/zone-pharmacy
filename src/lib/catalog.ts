import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "./db";
import { categories, products } from "./db/schema";
import { escapeLike } from "./utils";

export const cardColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  brand: products.brand,
  shortDescription: products.shortDescription,
  price: products.price,
  comparePrice: products.comparePrice,
  stock: products.stock,
  available: products.available,
  requiresPrescription: products.requiresPrescription,
  imageFileId: products.imageFileId,
  ratingAvg: products.ratingAvg,
  ratingCount: products.ratingCount,
  categoryName: categories.name,
};

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  shortDescription: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  available: boolean;
  requiresPrescription: boolean;
  imageFileId: string | null;
  ratingAvg: number;
  ratingCount: number;
  categoryName: string | null;
};

/** Products are public unless their category has been disabled by the admin. */
export const visible = or(isNull(products.categoryId), eq(categories.active, true)) as SQL;

export const getActiveCategories = cache(async () => {
  const db = await getDb();
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(eq(categories.active, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
});

export type ListParams = {
  q?: string;
  categorySlug?: string;
  brand?: string;
  min?: number;
  max?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
};

export async function listProducts(p: ListParams) {
  const db = await getDb();
  const where: SQL[] = [visible];
  if (p.q) {
    const term = `%${escapeLike(p.q.slice(0, 80))}%`;
    where.push(
      or(
        ilike(products.name, term),
        ilike(products.genericName, term),
        ilike(products.brand, term),
        ilike(categories.name, term),
      ) as SQL,
    );
  }
  if (p.categorySlug) where.push(eq(categories.slug, p.categorySlug));
  if (p.brand) where.push(eq(products.brand, p.brand));
  if (p.min !== undefined) where.push(gte(products.price, p.min));
  if (p.max !== undefined) where.push(lte(products.price, p.max));
  if (p.inStock) where.push(and(eq(products.available, true), gt(products.stock, 0)) as SQL);

  const order =
    p.sort === "price-asc"
      ? [asc(products.price)]
      : p.sort === "price-desc"
        ? [desc(products.price)]
        : p.sort === "newest"
          ? [desc(products.createdAt)]
          : p.sort === "rating"
            ? [desc(products.ratingAvg), desc(products.ratingCount)]
            : [desc(products.popular), desc(products.soldCount), asc(products.name)];

  const perPage = p.perPage ?? 24;
  const page = Math.max(1, p.page ?? 1);
  const base = () => db.select(cardColumns).from(products).leftJoin(categories, eq(products.categoryId, categories.id));
  const [items, [{ total }]] = await Promise.all([
    base()
      .where(and(...where))
      .orderBy(...order, asc(products.id))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...where)),
  ]);
  return { items: items as ProductCardData[], total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function listBrands(categorySlug?: string) {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ brand: products.brand })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(visible, ne(products.brand, ""), categorySlug ? eq(categories.slug, categorySlug) : undefined))
    .orderBy(asc(products.brand));
  return rows.map((r) => r.brand);
}

export async function productSection(kind: "featured" | "popular" | "new", limit = 12) {
  const db = await getDb();
  const q = db.select(cardColumns).from(products).leftJoin(categories, eq(products.categoryId, categories.id));
  const rows =
    kind === "featured"
      ? await q.where(and(visible, eq(products.featured, true))).orderBy(desc(products.createdAt), asc(products.id)).limit(limit)
      : kind === "popular"
        ? await q.where(and(visible, eq(products.popular, true))).orderBy(desc(products.soldCount), asc(products.id)).limit(limit)
        : await q.where(visible).orderBy(desc(products.createdAt), desc(products.id)).limit(limit);
  return rows as ProductCardData[];
}

export async function productsByIds(ids: number[]) {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(visible, inArray(products.id, ids)));
  return rows as ProductCardData[];
}

export async function relatedProducts(productId: number, categoryId: number | null, limit = 10) {
  const db = await getDb();
  const rows = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(visible, ne(products.id, productId), categoryId ? eq(products.categoryId, categoryId) : undefined))
    .orderBy(desc(products.soldCount), asc(products.id))
    .limit(limit);
  return rows as ProductCardData[];
}
