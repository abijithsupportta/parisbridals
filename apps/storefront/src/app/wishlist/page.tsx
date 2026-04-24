"use client";

import { useState, useEffect } from "react";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { Heart, Trash2 } from "lucide-react";
import Link from "next/link";

interface WishlistItem {
  id: string;
  name: string;
  price_per_day: number;
  images: string[];
}

export default function WishlistPage() {
  const [store, setStore] = useState<any>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function loadStore() {
      const storeData = await getParisBridalsStore();
      setStore(storeData);
    }
    loadStore();

    // Load wishlist from localStorage
    const saved = localStorage.getItem("paris_wishlist");
    if (saved) {
      setWishlistItems(JSON.parse(saved));
    }
    setMounted(true);
  }, []);

  const removeFromWishlist = (id: string) => {
    const updated = wishlistItems.filter((item) => item.id !== id);
    setWishlistItems(updated);
    localStorage.setItem("paris_wishlist", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("paris_wishlist_updated", { detail: updated.length }));
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />

      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-12">
            <div className="section-eyebrow justify-center">Your Collection</div>
            <h1 className="text-4xl sm:text-5xl font-serif text-heading mb-4">Saved Treasures</h1>
            <p className="text-body font-light">
              {wishlistItems.length} {wishlistItems.length === 1 ? "piece" : "pieces"} in your wishlist
            </p>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-rosegold/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart size={32} className="text-rosegold" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-serif text-heading mb-4">Your wishlist is empty</h2>
              <p className="text-body mb-8 max-w-md mx-auto">
                Save your favorite pieces here to view them later or add them to your enquiry cart.
              </p>
              <Link href="/collections">
                <Button className="shimmer-btn px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold">
                  Browse Collections
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {wishlistItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[var(--border-silk)] group hover:shadow-silk transition-all duration-500"
                >
                  <div className="relative aspect-square">
                    {item.images?.[0] && (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-rosegold hover:bg-rosegold hover:text-white transition-all shadow-sm"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-heading text-lg mb-2 line-clamp-2">{item.name}</h3>
                    <p className="text-body text-sm mb-3">₹{item.price_per_day.toLocaleString("en-IN")}/day</p>
                    <div className="flex gap-2">
                       <Link href={`/product/${item.id}`} className="flex-1">
                        <Button variant="outline" className="w-full py-3 rounded-full text-[10px] uppercase tracking-widest font-bold border-rosegold text-rosegold hover:bg-rosegold hover:text-white transition-all">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer store={store} />
    </main>
  );
}
