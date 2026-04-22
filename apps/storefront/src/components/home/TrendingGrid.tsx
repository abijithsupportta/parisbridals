import Image from "next/image";
import { trendingProducts } from "@/data/homepage";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function TrendingGrid() {
  return (
    <section className="bg-warm">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-end mb-16 px-4">
        <div>
          <span className="section-eyebrow">Curated Picks</span>
          <h2 className="section-title mb-0">Trending <em>Rentals</em></h2>
        </div>
        <Link href="/collections" className="text-xs uppercase tracking-widest font-medium border-b border-[#C4956A] pb-1 text-[#C4956A] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-all mt-6 md:mt-0">
          View Full Catalog
        </Link>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
        {trendingProducts.map((product) => (
          <div key={product.id} className="group relative bg-white border-subtle flex flex-col items-start h-full">
            <div className="relative w-full aspect-[4/5] overflow-hidden">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-[#1A1A1A] hover:bg-[#C4956A] hover:text-white transition-all shadow-sm">
                <Heart size={18} />
              </button>
              {product.tag && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-[#C4956A] text-white text-[10px] uppercase tracking-widest font-medium">
                  {product.tag}
                </div>
              )}
              <div className="absolute bottom-4 left-4 px-4 py-2 bg-white/90 backdrop-blur-md text-[#C4956A] text-sm font-semibold shadow-sm">
                ₹{product.pricePerDay}/day
              </div>
            </div>
            
            <div className="p-6 flex flex-col items-start w-full flex-grow">
              <span className="text-[10px] uppercase tracking-widest text-[#A0A0A0] mb-2">{product.category}</span>
              <h3 className="text-xl font-light serif mb-6 group-hover:text-[#C4956A] transition-colors">{product.name}</h3>
              
              <Link
                href={`/product/${product.id}`}
                className="mt-auto w-full py-3 border border-[#E8E5E0] text-[10px] uppercase tracking-[0.2em] font-medium text-center hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
