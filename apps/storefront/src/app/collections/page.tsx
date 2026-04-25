import { Suspense } from "react";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { getCategories, getProducts } from "@/lib/supabase/queries";
import CollectionsClient from "./CollectionsClient";

interface CollectionsPageProps {
  searchParams: Promise<{ 
    category_id?: string; 
    q?: string;
    sort?: string;
    featured?: string;
  }>;
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const store = await getParisBridalsStore();
  if (!store) return null;

  const params = await searchParams;
  const categoryId = params.category_id;
  const searchQuery = params.q;
  const isFeatured = params.featured === "true";

  // Fetch data in parallel
  const [categories, { products }] = await Promise.all([
    getCategories(store.id),
    getProducts(store.id, {
      categoryId,
      search: searchQuery,
      featured: isFeatured,
      limit: 50,
    }),
  ]);

  return (
    <main className="min-h-screen bg-silk selection:bg-rosegold/20 pb-20 lg:pb-0">
      <Header store={store} categories={categories} />
      
      <Suspense fallback={<div className="container mx-auto py-24 text-center">Loading collections...</div>}>
        <CollectionsClient 
          initialProducts={products}
          categories={categories}
          initialCategoryId={categoryId}
          initialSearchQuery={searchQuery}
        />
      </Suspense>

      <Footer store={store} />
    </main>
  );
}
