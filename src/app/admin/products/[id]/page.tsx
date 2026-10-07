import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/catalog-forms";
import { PageHeader } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { can } from "@/lib/permissions";

export const metadata = { title: "Product" };

/** Handles both /admin/products/new and /admin/products/[id]. */
export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage("manage_products");
  const { id } = await params;
  const db = await getDb();
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));

  let product;
  if (id !== "new") {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) notFound();
    [product] = await db.select().from(products).where(eq(products.id, numericId));
    if (!product) notFound();
  }

  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="size-4" /> All Products
      </Link>
      <PageHeader title={product ? `Edit ${product.name}` : "Add Product"} subtitle={product ? "Update product information, price and availability." : "Create a new product for your store."} />
      <ProductForm
        categories={cats}
        canEditStock={can(user, "manage_stock")}
        product={
          product && {
            id: product.id,
            name: product.name,
            genericName: product.genericName,
            brand: product.brand,
            shortDescription: product.shortDescription,
            description: product.description,
            categoryId: product.categoryId,
            price: product.price,
            comparePrice: product.comparePrice,
            costPrice: product.costPrice,
            stock: product.stock,
            lowStockThreshold: product.lowStockThreshold,
            available: product.available,
            requiresPrescription: product.requiresPrescription,
            featured: product.featured,
            popular: product.popular,
            expiryDate: product.expiryDate,
            imageFileId: product.imageFileId,
          }
        }
      />
    </>
  );
}
