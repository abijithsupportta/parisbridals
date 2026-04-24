"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, Category, getProductImageUrls } from "@/lib/supabase/queries";
import { Search, SlidersHorizontal, ArrowUpDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface CollectionsClientProps {
  initialProducts: Product[];
  categories: Category[];
  initialCategoryId?: string;
  initialSearchQuery?: string;
}

export default function CollectionsClient({
  initialProducts,
  categories,
  initialCategoryId,
  initialSearchQuery,
}: CollectionsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activeCategoryId, setActiveCategoryId] = useState(initialCategoryId || "");

  const handleCategoryChange = (id: string) => {
    setActiveCategoryId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("category_id", id);
    } else {
      params.delete("category_id");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Heading */}
      <div className="mb-8 sm:mb-12 text-center lg:text-left">
        <div className="section-eyebrow justify-center lg:justify-start">Our Treasures</div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-heading mb-4 leading-tight">
          {initialSearchQuery ? (
            <>Results for <em className="italic text-rosegold">"{initialSearchQuery}"</em></>
          ) : (
            <>Explore our <em className="italic text-rosegold">Masterpieces</em></>
          )}
        </h1>
        <p className="text-body max-w-2xl font-light text-sm sm:text-base">
          Browse Kerala's most exquisite bridal jewellery collection. Hand-selected pieces for your most precious moments.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-[72px] lg:top-[88px] z-30 mb-8 -mx-4 px-4 py-3 bg-silk/80 backdrop-blur-md border-y border-[var(--border-silk)]">
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => handleCategoryChange("")}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              !activeCategoryId
                ? "bg-rosegold text-white shadow-lg shadow-rosegold/20"
                : "bg-white text-muted-foreground hover:text-rosegold border border-[var(--border-silk)]"
            )}
          >
            All Collections
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeCategoryId === cat.id
                  ? "bg-rosegold text-white shadow-lg shadow-rosegold/20"
                  : "bg-white text-muted-foreground hover:text-rosegold border border-[var(--border-silk)]"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className={cn(
        "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8 transition-opacity duration-300",
        isPending && "opacity-50 pointer-events-none"
      )}>
        {initialProducts.length > 0 ? (
          initialProducts.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-[var(--border-silk)] shadow-sm hover:shadow-silk transition-all duration-700 hover:-translate-y-1.5"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-silk">
                {(() => {
                  const imageUrls = getProductImageUrls(product.images);
                  return imageUrls.length > 0 ? (
                    <Image
                      src={imageUrls[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-10">💎</div>
                  );
                })()}
                
                {/* Overlay Tags */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {product.is_featured && (
                    <Badge className="bg-white/90 backdrop-blur-sm text-rosegold text-[8px] sm:text-[9px] uppercase tracking-widest px-2 py-0.5 border-none shadow-sm">
                      Masterpiece
                    </Badge>
                  )}
                </div>

                {/* Quick View Button (Desktop) */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden sm:flex items-end p-4">
                  <div className="w-full py-3 bg-white/90 backdrop-blur-md text-rosegold text-[10px] font-bold uppercase tracking-widest text-center rounded-2xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    View Details
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 flex flex-col flex-1 text-center sm:text-left">
                <h3 className="text-sm sm:text-lg font-serif text-heading mb-2 line-clamp-1 group-hover:text-rosegold transition-colors">
                  {product.name}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-auto">
                  <span className="text-rosegold font-bold font-serif text-base sm:text-lg">
                    ₹{product.price_per_day.toLocaleString()}<span className="text-[10px] font-sans text-muted-foreground ml-1">/day</span>
                  </span>
                  <div className="hidden sm:block w-px h-3 bg-[var(--border-silk)]" />
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">
                    Sanitized
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-[var(--border-silk)]">
            <div className="w-16 h-16 bg-silk rounded-full flex items-center justify-center mx-auto mb-6 text-rosegold/30">
              <Search size={32} />
            </div>
            <h3 className="text-2xl font-serif text-heading mb-2">No Treasures Found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              We couldn't find any pieces matching your request. Try adjusting your filters or search keywords.
            </p>
            <button
              onClick={() => handleCategoryChange("")}
              className="mt-8 px-8 py-3 bg-rosegold text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-rosegold/20"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
