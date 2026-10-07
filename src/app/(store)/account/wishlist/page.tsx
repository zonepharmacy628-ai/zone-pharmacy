import { and, desc, eq } from "drizzle-orm";
import { Heart } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { cardColumns, visible, type ProductCardData } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { categories, products, wishlist } from "@/lib/db/schema";

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const db = await getDb();
  const items = (await db
    .select(cardColumns)
    .from(wishlist)
    .innerJoin(products, eq(wishlist.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(wishlist.userId, user.id), visible))
    .orderBy(desc(wishlist.createdAt))) as ProductCardData[];

  return (
    <section className="card p-5 sm:p-6">
      <h1 className="h-page mb-1">My Wishlist</h1>
      <p className="mb-5 text-sm text-navy-500">Products you saved for later. Tap the heart to remove one.</p>
      {items.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="Your wishlist is empty"
          text="Tap the heart on any product to save it here."
          action={
            <Link href="/products" className="btn btn-primary">
              Browse Products
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {items.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
