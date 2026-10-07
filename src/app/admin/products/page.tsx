import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Package, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";
import { DeleteProductButton } from "@/components/admin/catalog-forms";
import { ProductImage } from "@/components/brand";
import { Badge, EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { escapeLike, formatMoney } from "@/lib/utils";

export const metadata = { title: "Products" };
const PER_PAGE = 25;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  await requireStaffPage("manage_products");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const categoryId = Number.parseInt(sp.category ?? "", 10) || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const where: SQL[] = [];
  if (q) {
    const term = `%${escapeLike(q)}%`;
    where.push(or(ilike(products.name, term), ilike(products.genericName, term), ilike(products.brand, term)) as SQL);
  }
  if (categoryId) where.push(eq(products.categoryId, categoryId));

  const db = await getDb();
  const [rows, [{ total }], cats, settings] = await Promise.all([
    db
      .select({ p: products, categoryName: categories.name })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...where))
      .orderBy(asc(products.name))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(products).where(and(...where)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    getSettings(),
  ]);
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("category", String(categoryId));
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <>
      <PageHeader title="Products" subtitle={`${total} product${total === 1 ? "" : "s"}`}>
        <Link href="/admin/products/new" className="btn btn-primary">
          <Plus className="size-4" /> Add Product
        </Link>
      </PageHeader>
      <div className="card">
        <form action="/admin/products" className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row">
          <label htmlFor="prod-q" className="sr-only">
            Search products
          </label>
          <input id="prod-q" name="q" defaultValue={q ?? ""} placeholder="Search by name, medicine or brand" className="input py-2 sm:max-w-sm" />
          <label htmlFor="prod-cat" className="sr-only">
            Category
          </label>
          <select id="prod-cat" name="category" defaultValue={categoryId ?? ""} className="input py-2 sm:w-56">
            <option value="">All Categories</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary btn-sm">
            <Search className="size-4" /> Search
          </button>
        </form>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="No products found"
            text={q || categoryId ? "Try a different search." : "Add your first product to start selling."}
            action={
              <Link href="/admin/products/new" className="btn btn-primary">
                Add Product
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table-base min-w-[860px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, categoryName }) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <ProductImage name={p.name} imageFileId={p.imageFileId} sizes="44px" className="w-11 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <p className="font-semibold text-navy-900">{p.name}</p>
                          <p className="text-xs text-navy-500">{p.shortDescription}</p>
                        </div>
                      </div>
                    </td>
                    <td>{categoryName ?? "—"}</td>
                    <td>{p.brand || "—"}</td>
                    <td className="font-semibold whitespace-nowrap">{formatMoney(p.price, settings.currency)}</td>
                    <td>
                      {p.stock === 0 ? <Badge tone="red">Out of stock</Badge> : p.stock <= p.lowStockThreshold ? <Badge tone="amber">{p.stock} · Low</Badge> : <span className="font-semibold">{p.stock}</span>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {p.available ? <Badge tone="green">Available</Badge> : <Badge tone="gray">Unavailable</Badge>}
                        {p.requiresPrescription && <Badge tone="amber">Rx</Badge>}
                        {p.featured && <Badge>Featured</Badge>}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/admin/products/${p.id}`} className="btn btn-outline btn-sm">
                          <Pencil className="size-3.5" /> Edit
                        </Link>
                        <DeleteProductButton id={p.id} name={p.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} hrefFor={hrefFor} />
    </>
  );
}
