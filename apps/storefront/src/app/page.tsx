import { Suspense } from 'react';
import Header from "@/components/home/Header";
import HeroCarousel from "@/components/home/HeroCarousel";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import NewArrivals from "@/components/home/NewArrivals";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { getBanners, getCategories, getFeaturedProducts, getNewArrivals } from "@/lib/supabase/queries";

async function getStoreData() {
  const store = await getParisBridalsStore();
  return store;
}

export default async function Home() {
  const store = await getStoreData();

  if (!store) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-center bg-silk min-h-screen">
        <div className="text-center animate-fadeInUp">
          <h1 className="text-4xl font-serif text-heading mb-4">Paris Bridals</h1>
          <p className="text-body font-light">Elegance is taking a moment. Please check back soon.</p>
        </div>
      </div>
    );
  }

  const storeId = store.id;

  // Fetch data in parallel
  const [banners, categories, featuredProducts, newArrivals] = await Promise.all([
    getBanners(storeId),
    getCategories(storeId),
    getFeaturedProducts(storeId, 8),
    getNewArrivals(storeId, 10),
  ]);

  return (
    <main className="min-h-screen selection:bg-rosegold/20 selection:text-rosegold-dark">
      {/* Header with Categories */}
      <Header store={store} categories={categories} />

      {/* Hero Carousel */}
      <HeroCarousel banners={banners} />

      {/* Featured Masterpieces */}
      <Suspense fallback={<div className="h-[800px] animate-pulse bg-white" />}>
        <FeaturedProducts products={featuredProducts} />
      </Suspense>

      {/* New Arrivals */}
      <Suspense fallback={<div className="h-[600px] animate-pulse bg-silk-dark/30" />}>
        <NewArrivals products={newArrivals} />
      </Suspense>

      {/* Footer */}
      <Footer store={store} />
    </main>
  );
}
