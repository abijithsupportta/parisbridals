"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Product, Category, getProductImageUrls } from "@/lib/supabase/queries";
import { Search } from "lucide-react";
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
            <>Results for <em className="italic text-rosegold">&quot;{initialSearchQuery}&quot;</em></>
          ) : (
            <>Explore our <em className="italic text-rosegold">Masterpieces</em></>
          )}
        </h1>
        <p className="text-body max-w-2xl font-light text-sm sm:text-base">
          Browse Kerala&apos;s most exquisite bridal jewellery collection. Hand-selected pieces for your most precious moments.
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
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6 transition-opacity duration-300",
        isPending && "opacity-50 pointer-events-none"
      )}>
        {initialProducts.length > 0 ? (
          initialProducts.map((product) => (
            <CollectionProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-[var(--border-silk)]">
            <div className="w-16 h-16 bg-silk rounded-full flex items-center justify-center mx-auto mb-6 text-rosegold/30">
              <Search size={32} />
            </div>
            <h3 className="text-2xl font-serif text-heading mb-2">No Treasures Found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              We couldn&apos;t find any pieces matching your request. Try adjusting your filters or search keywords.
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


/**
 * Individual product card for collections grid.
 * Uses object-cover to FILL the container without distortion.
 */
function CollectionProductCard({ product }: { product: Product }) {
  const imageUrls = getProductImageUrls(product.images);
  const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block"
    >
      {/* Image — fills container, crops excess, no distortion */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl bg-silk-dark">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-10">💎</div>
        )}

        {/* Overlay Tags */}
        <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 flex flex-col gap-1.5">
          {product.is_featured && (
            <Badge className="bg-white/90 backdrop-blur-sm text-rosegold text-[8px] sm:text-[9px] uppercase tracking-widest px-2 py-0.5 border-none shadow-sm">
              Masterpiece
            </Badge>
          )}
        </div>

        {/* Quick View Button (Desktop) */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden sm:flex items-end p-3 lg:p-4">
          <div className="w-full py-2.5 bg-white/90 backdrop-blur-md text-rosegold text-[10px] font-bold uppercase tracking-widest text-center rounded-xl lg:rounded-2xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            View Details
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="mt-2.5 sm:mt-4 text-center sm:text-left px-0.5">
        <h3 className="text-[13px] sm:text-sm lg:text-base font-serif text-heading mb-1 sm:mb-1.5 line-clamp-1 group-hover:text-rosegold transition-colors leading-snug">
          {product.name}
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2.5 justify-center sm:justify-start">
          <span className="text-rosegold font-bold font-serif text-sm sm:text-base lg:text-lg">
            ₹{product.price_per_day.toLocaleString('en-IN')}<span className="text-[9px] sm:text-[10px] font-sans text-muted-foreground ml-0.5">/day</span>
          </span>
          <span className="hidden sm:inline-block w-px h-3 bg-[var(--border-silk)]" />
          <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-muted-foreground font-medium">
            Sanitized
          </span>
        </div>
      </div>
    </Link>
  );
}
