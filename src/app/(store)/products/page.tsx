import type { Metadata } from "next";
import { ProductListing, type ListingSearch } from "@/components/store/listing";

export async function generateMetadata({ searchParams }: { searchParams: Promise<ListingSearch> }): Promise<Metadata> {
  const q = (await searchParams).q;
  const term = Array.isArray(q) ? q[0] : q;
  return term
    ? { title: `Search: ${term.slice(0, 60)}`, robots: { index: false } }
    : { title: "All Products", description: "Browse medicines, vitamins, baby care, personal care and medical devices.", alternates: { canonical: "/products" } };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<ListingSearch> }) {
  return <ProductListing search={await searchParams} basePath="/products" />;
}
