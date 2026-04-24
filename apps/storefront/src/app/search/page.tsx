import { Suspense } from "react";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { getCategories, getFeaturedProducts } from "@/lib/supabase/queries";
import SearchClient from "./search-client";

export default async function SearchPage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  const [categories, featured] = await Promise.all([
    getCategories(store.id),
    getFeaturedProducts(store.id, 6),
  ]);

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} categories={categories} />
      
      <div className="lg:hidden">
        <SearchClient 
          categories={categories} 
          featured={featured} 
        />
      </div>

      {/* For desktop, maybe just show a generic prompt or redirect if they somehow landed here, 
          but usually the search bar handles it. Let's provide a basic desktop view just in case. */}
      <div className="hidden lg:block max-w-7xl mx-auto px-8 py-20 text-center">
        <h1 className="text-4xl font-serif text-heading mb-4">Search Our Collections</h1>
        <p className="text-body max-w-md mx-auto mb-10">Use the search bar in the header to find specific pieces or browse our categories below.</p>
        <div className="grid grid-cols-4 gap-6">
           {categories.slice(0, 4).map(cat => (
             <a key={cat.id} href={`/collections?category_id=${cat.id}`} className="bg-white p-6 rounded-3xl shadow-silk hover:-translate-y-1 transition-all">
               <span className="font-serif text-lg">{cat.name}</span>
             </a>
           ))}
        </div>
      </div>

      <Footer store={store} />
    </main>
  );
}
