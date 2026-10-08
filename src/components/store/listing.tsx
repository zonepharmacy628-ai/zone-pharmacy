import { LayoutGrid, PackageSearch, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/brand";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { getActiveCategories, listBrands, listProducts } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { Breadcrumbs } from "./sections";

export type ListingSearch = Record<string, string | string[] | undefined>;

const SORTS = [
  ["popular", "Popularity"],
  ["newest", "Newest"],
  ["price-asc", "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
  ["rating", "Top Rated"],
] as const;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | undefined) => {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) && n >= 0 ? n : undefined;
};

export async function ProductListing({
  search,
  category,
  basePath,
}: {
  search: ListingSearch;
  category?: { name: string; slug: string };
  basePath: string;
}) {
  const q = one(search.q)?.slice(0, 80);
  const brand = one(search.brand);
  const min = num(one(search.min));
  const max = num(one(search.max));
  const inStock = one(search.stock) === "1";
  const sort = SORTS.some(([key]) => key === one(search.sort)) ? one(search.sort)! : "popular";
  const page = Math.max(1, Math.floor(num(one(search.page)) ?? 1));

  const [categories, brands, result] = await Promise.all([
    getActiveCategories(),
    listBrands(category?.slug),
    listProducts({ q, categorySlug: category?.slug, brand, min, max, inStock, sort, page }),
  ]);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (brand) params.set("brand", brand);
  if (min !== undefined) params.set("min", String(min));
  if (max !== undefined) params.set("max", String(max));
  if (inStock) params.set("stock", "1");
  if (sort !== "popular") params.set("sort", sort);
  const hrefFor = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const hasFilters = Boolean(brand || min !== undefined || max !== undefined || inStock);
  const title = q ? `Results for “${q}”` : (category?.name ?? "All Products");

  const filters = (
    <form action={basePath} className="space-y-5">
      {q && <input type="hidden" name="q" value={q} />}
      <div>
        <label htmlFor="flt-sort" className="label">
          Sort by
        </label>
        <select id="flt-sort" name="sort" defaultValue={sort} className="input">
          {SORTS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {brands.length > 0 && (
        <div>
          <label htmlFor="flt-brand" className="label">
            Brand
          </label>
          <select id="flt-brand" name="brand" defaultValue={brand ?? ""} className="input">
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}
      <fieldset>
        <legend className="label">Price (Rs.)</legend>
        <div className="flex items-center gap-2">
          <input type="number" name="min" min={0} step="1" inputMode="numeric" placeholder="Min" defaultValue={min ?? ""} aria-label="Minimum price" className="input" />
          <span className="text-navy-400">–</span>
          <input type="number" name="max" min={0} step="1" inputMode="numeric" placeholder="Max" defaultValue={max ?? ""} aria-label="Maximum price" className="input" />
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-navy-900">
        <input type="checkbox" name="stock" value="1" defaultChecked={inStock} className="size-4 accent-brand-600" />
        In stock only
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          Apply Filters
        </button>
        {hasFilters && (
          <Link href={q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath} className="btn btn-outline">
            Clear
          </Link>
        )}
      </div>
    </form>
  );

  const categoryList = (
    <ul className="space-y-0.5">
      <li>
        <Link href="/products" className={cn("flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium", !category ? "bg-brand-600 text-white" : "text-navy-800 hover:bg-brand-50")}>
          All Products
        </Link>
      </li>
      {categories.map((c) => {
        const active = category?.slug === c.slug;
        return (
          <li key={c.id}>
            <Link
              href={`/category/${c.slug}`}
              aria-current={active ? "page" : undefined}
              className={cn("flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium", active ? "bg-brand-600 text-white" : "text-navy-800 hover:bg-brand-50")}
            >
              <CategoryIcon name={c.icon} className="size-4 shrink-0" />
              <span className="flex-1">{c.name}</span>
              <span className={cn("text-xs", active ? "text-white/80" : "text-navy-400")}>{c.productCount}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="container-page py-5 sm:py-8">
      <Breadcrumbs items={category ? [{ label: "All Products", href: "/products" }, { label: category.name }] : [{ label: "All Products" }]} />
      <div className="mb-5">
        <h1 className="h-page">{title}</h1>
        <p className="mt-1 text-sm text-navy-500">
          {result.total} product{result.total === 1 ? "" : "s"} found
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <details className="card group p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-navy-900">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-brand-600" /> Filters &amp; Sort
              </span>
              <span className="text-xs font-semibold text-brand-600 group-open:hidden">Show</span>
              <span className="hidden text-xs font-semibold text-brand-600 group-open:inline">Hide</span>
            </summary>
            <div className="mt-4">{filters}</div>
          </details>

          <details className="card group p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-navy-900">
              <span className="flex min-w-0 items-center gap-2">
                <LayoutGrid className="size-4 shrink-0 text-brand-600" />
                <span className="truncate">Categories{category ? `: ${category.name}` : ""}</span>
              </span>
              <span className="text-xs font-semibold text-brand-600 group-open:hidden">Show</span>
              <span className="hidden text-xs font-semibold text-brand-600 group-open:inline">Hide</span>
            </summary>
            <nav aria-label="Categories" className="mt-3">
              {categoryList}
            </nav>
          </details>

          <nav aria-label="Categories" className="card hidden p-3 lg:block">
            <h2 className="px-2 pt-1 pb-2 text-base font-bold text-navy-900">Categories</h2>
            {categoryList}
          </nav>

          <div className="card hidden p-4 lg:block">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-navy-900">
              <SlidersHorizontal className="size-4 text-brand-600" /> Filters
            </h2>
            {filters}
          </div>
        </aside>

        <div>
          {result.items.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<PackageSearch />}
                title="No products found"
                text={q ? "We couldn't find a match. Try a different name, or ask us to source it for you." : "Try changing or clearing the filters."}
                action={
                  <Link href={q ? `/medicine-request?medicine=${encodeURIComponent(q)}` : basePath} className="btn btn-primary">
                    {q ? "Request This Medicine" : "Clear Filters"}
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {result.items.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} priority={i < 4} />
                </li>
              ))}
            </ul>
          )}
          <Pagination page={result.page} pages={result.pages} hrefFor={hrefFor} />
        </div>
      </div>
    </div>
  );
}
