import { asc, eq, sql } from "drizzle-orm";
import { CategoryManager } from "@/components/admin/catalog-forms";
import { PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireStaffPage("manage_products");
  const db = await getDb();
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      active: categories.active,
      sortOrder: categories.sortOrder,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return (
    <>
      <PageHeader title="Categories" subtitle="Add, edit, enable or disable the categories shown on your website." />
      <CategoryManager categories={rows} />
    </>
  );
}
