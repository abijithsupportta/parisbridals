"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import { Category, Product } from "@/lib/supabase/queries";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SearchClientProps {
  categories: Category[];
  featured: Product[];
}

export default function SearchClient({ categories, featured }: SearchClientProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Autofocus on mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/collections?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const trendingSearches = [
    "Choker Sets", "Temple Jewellery", "Antique Necklace", "Kundan Bangles"
  ];

  return (
    <div className="min-h-[80vh] flex flex-col bg-silk animate-in fade-in duration-500">
      {/* Search Input Area */}
      <div className="px-5 pt-8 pb-6 bg-white border-b border-[var(--border-silk)] rounded-b-[2.5rem] shadow-silk">
        <form onSubmit={handleSearch} className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search our treasures..."
            className="w-full h-14 pl-12 pr-12 bg-silk/50 border border-[var(--border-silk)] rounded-full text-lg focus:outline-none focus:border-rosegold focus:ring-4 focus:ring-rosegold/5 transition-all placeholder:text-muted-foreground/50"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-rosegold size-5" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-rosegold transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </form>

        {query.trim() && (
          <button
            onClick={handleSearch}
            className="mt-6 w-full flex items-center justify-between px-6 py-4 bg-rosegold text-white rounded-full font-bold shadow-xl animate-in slide-in-from-top-2"
          >
            <span className="text-sm uppercase tracking-widest">Search for "{query}"</span>
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      {/* Recommendations Content */}
      <div className="flex-1 px-5 py-8 space-y-10 overflow-y-auto pb-32">
        {/* Trending Searches */}
        <section className="animate-in slide-in-from-bottom-2 delay-100 fill-both">
          <div className="flex items-center gap-2 mb-4 text-rosegold">
            <TrendingUp size={16} />
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold">Trending Searches</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setQuery(item);
                  router.push(`/collections?q=${encodeURIComponent(item)}`);
                }}
                className="px-4 py-2 bg-white border border-[var(--border-silk)] rounded-full text-sm text-heading hover:border-rosegold transition-all active:scale-95"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* Explore Categories */}
        <section className="animate-in slide-in-from-bottom-2 delay-200 fill-both">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-heading">Explore Categories</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {categories.slice(0, 4).map((category) => (
              <button
                key={category.id}
                onClick={() => router.push(`/collections?category_id=${category.id}`)}
                className="relative h-24 rounded-2xl overflow-hidden group border border-[var(--border-silk)] shadow-sm active:scale-95 transition-transform"
              >
                {category.image_url ? (
                  <Image
                    src={category.image_url}
                    alt={category.name}
                    fill
                    className="object-cover opacity-60 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="absolute inset-0 bg-rosegold/5" />
                )}
                <div className="absolute inset-0 flex items-center justify-center p-3 text-center bg-black/5">
                  <span className="text-sm font-serif font-bold text-heading">{category.name}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Masterpieces You'll Love */}
        <section className="animate-in slide-in-from-bottom-2 delay-300 fill-both">
          <div className="flex items-center gap-2 mb-4 text-rosegold">
            <Sparkles size={16} />
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold">Recommended For You</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
            {featured.map((product) => (
              <button
                key={product.id}
                onClick={() => router.push(`/product/${product.id}`)}
                className="snap-start shrink-0 w-36 text-left group"
              >
                <div className="aspect-[3/4] relative rounded-2xl overflow-hidden mb-2 shadow-sm border border-[var(--border-silk)]">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-rosegold/5" />
                  )}
                </div>
                <h4 className="text-xs font-serif font-bold text-heading line-clamp-1">{product.name}</h4>
                <p className="text-[10px] text-rosegold font-bold">₹{product.price_per_day}/day</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
