"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Heart, Share2, ShieldCheck, Sparkles, Truck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import WhatsAppOrderModal from "./WhatsAppOrderModal";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { getProductImageUrls } from "@/lib/supabase/queries";

interface ProductDetailsProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    price_per_day: number;
    security_deposit: number;
    // Stored as JSONB in DB
    images: any[];
    category?: { id: string; name: string; slug: string } | null;
    available_quantity: number;
    track_inventory: boolean;
  };
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const [addedToCart, setAddedToCart] = useState(false);
  const [addedToWishlist, setAddedToWishlist] = useState(false);

  const images = getProductImageUrls(product.images);
  const mainImage = images[activeImage] || null;
  const inStock = !product.track_inventory || product.available_quantity > 0;

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("paris_cart") || "[]");
    const exists = cart.some((item: any) => item.id === product.id);
    if (!exists) {
      const newItem = {
        id: product.id,
        name: product.name,
        price_per_day: product.price_per_day,
        images: images,
      };
      const newCart = [...cart, newItem];
      localStorage.setItem("paris_cart", JSON.stringify(newCart));
      window.dispatchEvent(new CustomEvent("paris_cart_updated", { detail: newCart.length }));
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const addToWishlist = () => {
    const wishlist = JSON.parse(localStorage.getItem("paris_wishlist") || "[]");
    const exists = wishlist.some((item: any) => item.id === product.id);
    if (!exists) {
      const newItem = {
        id: product.id,
        name: product.name,
        price_per_day: product.price_per_day,
        images: images,
      };
      const newWish = [...wishlist, newItem];
      localStorage.setItem("paris_wishlist", JSON.stringify(newWish));
      window.dispatchEvent(new CustomEvent("paris_wishlist_updated", { detail: newWish.length }));
    }
    setAddedToWishlist(true);
    setTimeout(() => setAddedToWishlist(false), 2000);
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
                  href={`/collections?category_id=${product.category.id}`}
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
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setModalOpen(true)}
                  disabled={!inStock}
                  className="shimmer-btn w-full py-6 rounded-full text-xs uppercase tracking-[0.2em] font-bold border-none shadow-xl disabled:opacity-50"
                >
                  Book for your Event
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={addToCart}
                    className={cn(
                      "py-6 rounded-full text-[10px] uppercase tracking-[0.1em] font-bold border-heading text-heading hover:bg-heading/5 transition-all",
                      addedToCart && "bg-heading text-white border-none"
                    )}
                  >
                    <ShoppingBag size={14} className="mr-2" />
                    {addedToCart ? "In Cart" : "Add to Cart"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={addToWishlist}
                    className={cn(
                      "py-6 rounded-full text-[10px] uppercase tracking-[0.1em] font-bold border-rosegold text-rosegold hover:bg-rosegold/5 transition-all",
                      addedToWishlist && "bg-rosegold text-white border-none"
                    )}
                  >
                    <Heart size={14} className={cn("mr-2", addedToWishlist && "fill-white")} />
                    {addedToWishlist ? "Saved" : "Wishlist"}
                  </Button>
                </div>
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
            Book for Event
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
