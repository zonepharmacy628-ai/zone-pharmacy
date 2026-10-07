import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing, type ListingSearch } from "@/components/store/listing";
import { getActiveCategories } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ListingSearch> };

async function findCategory(slug: string) {
  return (await getActiveCategories()).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: `Shop ${category.name} online — genuine products, fair prices and fast delivery.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();
  return <ProductListing search={await searchParams} category={category} basePath={`/category/${category.slug}`} />;
}
