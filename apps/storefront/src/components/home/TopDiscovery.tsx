"use client";

import Link from "next/link";
import { Category } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

interface TopDiscoveryProps {
  categories: Category[];
}

export default function TopDiscovery({ categories }: TopDiscoveryProps) {
  // Use real data, with fallbacks for images if necessary
  const displayCategories = categories.length > 0 ? categories : [
    { name: "Bridal Sets", slug: "bridal-sets", image_url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400" },
    { name: "Necklaces", slug: "necklaces", image_url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400" },
    { name: "Earrings", slug: "earrings", image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400" },
    { name: "Bangles", slug: "bangles", image_url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400" },
    { name: "Rings", slug: "rings", image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400" },
  ];

  return (
    <div className="lg:hidden bg-white/50 backdrop-blur-md pt-2 pb-6 border-b border-border/50">
      <div className="flex overflow-x-auto gap-6 px-6 hide-scrollbar snap-x snap-mandatory">
        {/* "For You" Circle - Ref: Toy Shop */}
        <Link 
          href="/collections?filter=for-you"
          className="flex flex-col items-center gap-3 snap-start group shrink-0"
        >
          <div className="relative size-16 sm:size-20 rounded-full flex items-center justify-center bg-rosegold text-white shadow-lg shadow-rosegold/30 border-2 border-white ring-4 ring-rosegold/5 transition-transform group-active:scale-95">
             <span className="text-[10px] uppercase font-bold tracking-widest text-center leading-tight">For<br/>You</span>
             <div className="absolute -inset-1 rounded-full border border-rosegold/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-rosegold leading-none">Discovery</span>
        </Link>

        {displayCategories.map((category, index) => (
          <Link
            key={index}
            href={`/collections?category=${category.slug}`}
            className="flex flex-col items-center gap-3 snap-start group shrink-0 animate-in fade-in slide-in-from-right-10 duration-500"
            style={{ animationDelay: `${(index + 1) * 100}ms` }}
          >
            <div className="relative size-16 sm:size-20 rounded-full overflow-hidden bg-white border-2 border-[var(--border-silk)] shadow-silk group-hover:border-rosegold transition-all group-active:scale-95">
              <img
                src={category.image_url || "/placeholder-image.png"}
                alt={category.name}
                className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-rosegold/0 group-hover:bg-rosegold/5 transition-colors" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-body group-hover:text-rosegold transition-colors leading-none truncate max-w-[80px]">
              {category.name.split(' ')[0]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
