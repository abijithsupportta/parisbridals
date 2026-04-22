import Link from "next/link";
import { Product } from "@/lib/supabase/queries";
import { Card, CardContent } from "@/components/ui/card";

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
          <div className="flex gap-4 pb-3 w-max">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group snap-start shrink-0"
                style={{ width: "48vw", maxWidth: "210px" }}
              >
                <Card className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-white border border-[var(--border-silk)] shadow-sm">
                  <CardContent className="p-0 h-full w-full">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-rosegold/5 text-4xl opacity-20">
                        💎
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white/85 to-transparent pointer-events-none" />
                  </CardContent>
                </Card>
                <div className="mt-3 px-0.5">
                  <h3 className="text-sm font-serif text-heading mb-1 line-clamp-1 group-hover:text-rosegold transition-colors">
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
        <div className="hidden lg:grid lg:grid-cols-4 gap-8 px-6 md:px-12 stagger-children">
          {products.slice(0, 4).map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group"
            >
              <Card className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-white border border-[var(--border-silk)] shadow-sm hover:shadow-silk transition-all duration-700 hover:-translate-y-2">
                <CardContent className="p-0 h-full w-full">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-rosegold/5 text-4xl opacity-20">
                      💎
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white/85 to-transparent pointer-events-none" />
                </CardContent>
              </Card>
              <div className="mt-5 px-1">
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
