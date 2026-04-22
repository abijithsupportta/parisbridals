"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Heart, Share2, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import WhatsAppOrderModal from "./WhatsAppOrderModal";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface ProductDetailsProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    price_per_day: number;
    security_deposit: number;
    images: string[];
    category?: { id: string; name: string; slug: string } | null;
    available_quantity: number;
    track_inventory: boolean;
  };
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const images = product.images && product.images.length > 0 ? product.images : [];
  const mainImage = images[activeImage] || null;
  const inStock = !product.track_inventory || product.available_quantity > 0;

  const handleQuickEnquire = () => {
    const message = buildOrderMessage({
      productName: product.name,
      price: product.price_per_day,
      categoryName: product.category?.name,
      quantity: 1,
      customerName: "(please share)",
      customerPhone: "(please share)",
    });
    window.open(buildWhatsAppUrl(message), "_blank");
  };

  return (
    <>
      <section className="pt-6 sm:pt-10 md:pt-14 pb-10 sm:pb-16 md:pb-20 bg-silk">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-caption mb-5 sm:mb-8 overflow-x-auto hide-scrollbar">
            <Link href="/" className="hover:text-rosegold transition-colors whitespace-nowrap">
              Home
            </Link>
            <ChevronRight size={12} />
            <Link href="/collections" className="hover:text-rosegold transition-colors whitespace-nowrap">
              Collections
            </Link>
            {product.category && (
              <>
                <ChevronRight size={12} />
                <Link
                  href={`/collections?category=${product.category.slug}`}
                  className="hover:text-rosegold transition-colors whitespace-nowrap"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight size={12} />
            <span className="text-heading font-medium line-clamp-1">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-16">
            {/* Image Gallery */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-[var(--border-silk)] shadow-silk group">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-rosegold/5 text-7xl opacity-30">
                    💎
                  </div>
                )}

                {/* Favorites / Share */}
                <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex gap-2">
                  <button
                    aria-label="Add to favorites"
                    className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center text-heading hover:text-rosegold shadow-md transition-colors"
                  >
                    <Heart size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    aria-label="Share"
                    className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center text-heading hover:text-rosegold shadow-md transition-colors"
                  >
                    <Share2 size={16} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Stock badge */}
                {!inStock && (
                  <div className="absolute top-3 left-3 sm:top-5 sm:left-5">
                    <Badge className="bg-heading/90 text-white text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full">
                      Out of stock
                    </Badge>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 sm:gap-3 overflow-x-auto hide-scrollbar pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={cn(
                        "relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-300",
                        activeImage === idx
                          ? "border-rosegold"
                          : "border-transparent hover:border-rosegold/40"
                      )}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              {product.category && (
                <span className="section-eyebrow mb-3">
                  {product.category.name}
                </span>
              )}

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-heading tracking-tight leading-[1.1] mb-3 sm:mb-4">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3 mb-5 sm:mb-6">
                <p className="text-3xl sm:text-4xl font-serif text-rosegold font-semibold">
                  ₹{product.price_per_day.toLocaleString("en-IN")}
                </p>
                <span className="text-xs sm:text-sm uppercase tracking-[0.2em] text-caption font-medium">
                  for your event
                </span>
              </div>

              {product.security_deposit > 0 && (
                <div className="text-xs text-body mb-5 sm:mb-6">
                  Refundable security deposit:{" "}
                  <span className="font-semibold text-heading">
                    ₹{product.security_deposit.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {product.description && (
                <p className="text-sm sm:text-base text-body leading-relaxed mb-6 sm:mb-8 font-light">
                  {product.description}
                </p>
              )}

              {/* Features */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
                {[
                  { icon: ShieldCheck, label: "Certified Authentic" },
                  { icon: Sparkles, label: "Sanitized & Ready" },
                  { icon: Truck, label: "Safe Delivery" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center text-center gap-1.5 p-3 sm:p-4 rounded-2xl bg-white border border-[var(--border-silk)]"
                  >
                    <Icon className="text-rosegold" size={18} strokeWidth={1.5} />
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-body font-medium leading-tight">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="hidden lg:flex flex-col gap-3">
                <Button
                  onClick={() => setModalOpen(true)}
                  disabled={!inStock}
                  className="shimmer-btn w-full py-6 rounded-full text-xs uppercase tracking-[0.2em] font-bold border-none shadow-xl disabled:opacity-50"
                >
                  Order on WhatsApp
                </Button>
                <button
                  onClick={handleQuickEnquire}
                  className="text-xs uppercase tracking-[0.2em] font-medium text-rosegold hover:text-rosegold-dark transition-colors py-2"
                >
                  Or send a quick enquiry →
                </button>
              </div>

              {/* Trust note */}
              <div className="mt-6 pt-6 border-t border-[var(--border-silk)] space-y-2">
                <p className="text-xs text-caption uppercase tracking-widest">
                  ✓ Order confirmation on WhatsApp
                </p>
                <p className="text-xs text-caption uppercase tracking-widest">
                  ✓ Free fittings & styling
                </p>
                <p className="text-xs text-caption uppercase tracking-widest">
                  ✓ Trusted by 500+ brides
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky mobile order bar (visible only on product pages, mobile only) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--border-silk)] shadow-[0_-4px_24px_rgba(183,110,121,0.08)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-caption leading-none mb-1">
              Rental Price
            </p>
            <p className="text-base font-serif text-rosegold font-semibold leading-none">
              ₹{product.price_per_day.toLocaleString("en-IN")}
              <span className="text-[10px] text-caption ml-1 font-sans">for event</span>
            </p>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            disabled={!inStock}
            className="shimmer-btn flex-1 py-3 rounded-full text-xs font-semibold tracking-[0.15em] text-white uppercase disabled:opacity-50"
          >
            Order on WhatsApp
          </Button>
        </div>
      </div>

      {/* Modal */}
      <WhatsAppOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={{
          name: product.name,
          price_per_day: product.price_per_day,
          categoryName: product.category?.name,
          image: mainImage,
        }}
      />
    </>
  );
}
