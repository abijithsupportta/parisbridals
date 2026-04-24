import { Suspense } from 'react';
import Header from "@/components/home/Header";
import HeroCarousel from "@/components/home/HeroCarousel";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import NewArrivals from "@/components/home/NewArrivals";
import EditorialBanner from "@/components/home/EditorialBanner";
import SplitPromoBanners from "@/components/home/SplitPromoBanners";
import HowItWorks from "@/components/home/HowItWorks";
import CustomerReviews from "@/components/home/CustomerReviews";
import FinalCTA from "@/components/home/FinalCTA";
import Footer from "@/components/home/Footer";
import TrustBadges from "@/components/home/TrustBadges";
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
  const [bannersRaw, categories, featuredProducts, newArrivals] = await Promise.all([
    getBanners(storeId),
    getCategories(storeId),
    getFeaturedProducts(storeId, 8),
    getNewArrivals(storeId, 10),
  ]);

  // Filter banners by type and ensure they have images
  const banners = bannersRaw.filter(b => b.web_image_url && b.web_image_url.trim() !== '');
  
  const heroBanners = banners.filter(b => (b as any).banner_type === 'hero' || !(b as any).banner_type);
  const editorialBanners = banners.filter(b => (b as any).banner_type === 'editorial');
  const splitBanners = banners.filter(b => (b as any).banner_type === 'split');

  return (
    <main className="min-h-screen selection:bg-rosegold/20 selection:text-rosegold-dark">
      {/* 1. Header with Categories */}
      <Header store={store} categories={categories} />

      {/* 2. Hero (Panoramic Fix) */}
      <HeroCarousel banners={heroBanners.length > 0 ? heroBanners : banners.slice(0, 5)} />

      {/* 3. Featured Masterpieces */}
      <Suspense fallback={<div className="h-[800px] animate-pulse bg-white" />}>
        <FeaturedProducts products={featuredProducts} />
      </Suspense>

      {/* 4. Trust Badges */}
      <TrustBadges />
      
      {/* 5. Editorial Storytelling */}
      <Suspense fallback={<div className="h-[700px] animate-pulse bg-silk" />}>
        <EditorialBanner banners={editorialBanners.length > 0 ? editorialBanners : banners} />
      </Suspense>
      
      {/* 6. Latest Treasures (New Arrivals) */}
      <Suspense fallback={<div className="h-[600px] animate-pulse bg-silk-dark/30" />}>
        <NewArrivals products={newArrivals} />
      </Suspense>

      {/* 7. Split Collections */}
      <Suspense fallback={<div className="h-[600px] animate-pulse bg-white" />}>
        <SplitPromoBanners banners={splitBanners.length > 0 ? splitBanners : banners} />
      </Suspense>

      {/* 8. The Experience (How It Works) */}
      <HowItWorks />

      {/* 9. Bridal Stories (Reviews) */}
      <CustomerReviews />
      
      {/* 10. Final Invitation (CTA) */}
      <FinalCTA />
      
      {/* 11. Footer */}
      <Footer store={store} />
    </main>
  );
}
