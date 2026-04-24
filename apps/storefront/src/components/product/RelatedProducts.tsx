import Link from "next/link";
import { Product } from "@/lib/supabase/queries";

interface RelatedProductsProps {
  products: Product[];
  heading?: string;
  eyebrow?: string;
}

export default function RelatedProducts({
  products,
  heading = "You May Also Love",
  eyebrow = "More from the collection",
}: RelatedProductsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-silk-dark/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center px-6 mb-8 sm:mb-12 md:mb-16 animate-fadeInUp">
          <span className="section-eyebrow justify-center after:content-[''] after:w-8 after:h-px after:bg-rosegold-light">
            {eyebrow}
          </span>
          <h2 className="section-title">
            {heading.split(" ").slice(0, -2).join(" ")}{" "}
            <em>{heading.split(" ").slice(-2).join(" ")}</em>
          </h2>
        </div>

        {/* Mobile: horizontal snap scroll */}
        <div className="lg:hidden px-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar">
          <div className="flex gap-3 pb-3 w-max">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group snap-start shrink-0"
                style={{ width: "44vw", maxWidth: "200px" }}
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-silk-dark">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-rosegold/5 text-4xl opacity-20">
                      💎
                    </div>
                  )}
                  {/* Subtle depth gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/8 to-transparent pointer-events-none" />
                </div>
                <div className="mt-2.5 px-0.5">
                  <h3 className="text-[13px] font-serif text-heading mb-1 line-clamp-1 group-hover:text-rosegold transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-rosegold font-bold font-serif">
                    ₹{product.price_per_day.toLocaleString("en-IN")}/day
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop: grid */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6 xl:gap-8 px-6 md:px-12 stagger-children">
          {products.slice(0, 4).map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group block"
            >
              <div className="relative aspect-[3/4] rounded-2xl xl:rounded-3xl overflow-hidden bg-silk-dark shadow-sm hover:shadow-silk transition-all duration-700 group-hover:-translate-y-2">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-rosegold/5 text-4xl opacity-20">
                    💎
                  </div>
                )}
                {/* Subtle depth gradient */}
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/8 to-transparent pointer-events-none" />
              </div>
              <div className="mt-4 px-1">
                <h3 className="text-[15px] font-serif text-heading mb-1.5 line-clamp-1 group-hover:text-rosegold transition-colors">
                  {product.name}
                </h3>
                <p className="text-[13px] text-rosegold font-bold font-serif">
                  ₹{product.price_per_day.toLocaleString("en-IN")}/day
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
