"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Heart } from "lucide-react";
import { Store, Category } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import ActionSearchBar from "@/components/ui/action-search-bar";

interface HeaderProps {
  store: Store | null;
  categories?: Category[];
}

export default function Header({ store, categories }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 40;
      if (scrolled !== isScrolled) setIsScrolled(scrolled);
    };

    const loadCounts = () => {
      const cart = JSON.parse(localStorage.getItem("paris_cart") || "[]");
      const wish = JSON.parse(localStorage.getItem("paris_wishlist") || "[]");
      setCartCount(cart.length);
      setWishlistCount(wish.length);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    loadCounts();

    // Track viewport size for category bar behavior
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mediaQuery.matches);
    const handleMedia = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handleMedia);

    const handleCartUpdate = (e: any) => setCartCount(e.detail);
    const handleWishUpdate = (e: any) => setWishlistCount(e.detail);

    window.addEventListener("paris_cart_updated", handleCartUpdate);
    window.addEventListener("paris_wishlist_updated", handleWishUpdate);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      mediaQuery.removeEventListener("change", handleMedia);
      window.removeEventListener("paris_cart_updated", handleCartUpdate);
      window.removeEventListener("paris_wishlist_updated", handleWishUpdate);
    };
  }, [isScrolled]);

  // Only collapse categories to badges on desktop when scrolled
  const compactCategories = isScrolled && isDesktop;

  const storeName = store?.name || "Paris Bridals";
  const logoUrl = store?.logo_url || "/logo_paris.svg";

  const displayCategories = categories?.filter(c => !c.parent_id) || [];

  const navLinks = [
    { label: "Collections", href: "/collections" },
    { label: "About", href: "/about" },
  ];

  return (
    <>
      <nav
        className={cn(
          "sticky top-0 z-50 transition-all duration-300 border-b bg-white",
          isScrolled ? "py-2 border-[var(--border-silk)] shadow-sm" : "py-4 border-transparent"
        )}
      >
        <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4 sm:gap-10">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group shrink-0 transition-all duration-500">
              <div className="relative overflow-hidden rounded-full">
                <Image
                  src={logoUrl}
                  alt={storeName}
                  width={140}
                  height={40}
                  className={cn(
                    "w-auto object-contain transition-all duration-500",
                    isScrolled ? "h-7 sm:h-8" : "h-9 sm:h-10 md:h-12"
                  )}
                />
              </div>
              <span className="hidden sm:inline text-sm sm:text-base md:text-xl font-serif tracking-[0.2em] uppercase text-rosegold transition-colors leading-none">
                {storeName}
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[11px] uppercase tracking-[0.15em] font-bold text-rosegold transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-rosegold after:transition-all hover:after:w-full"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Actions & Search */}
            <div className="flex items-center flex-1 justify-end gap-2 sm:gap-4 shrink-0">
              {/* Search Bar — uses ActionSearchBar on all sizes */}
              <div className="flex-1 max-w-[400px]">
                <ActionSearchBar storeId={store?.id} />
              </div>

              <div className="flex items-center gap-1 hidden sm:flex">
                <Link
                  href="/wishlist"
                  className="hidden sm:flex p-2.5 text-body hover:text-rosegold transition-all hover:bg-rosegold/5 rounded-full relative"
                  aria-label="Wishlist"
                >
                  <Heart size={20} strokeWidth={1.5} />
                  {wishlistCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-rosegold text-white text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full border border-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/cart"
                  className="hidden sm:flex p-2.5 text-body hover:text-rosegold transition-all hover:bg-rosegold/5 rounded-full relative"
                  aria-label="Enquiry Cart"
                >
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-heading text-white text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full border border-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Category Bar */}
        {displayCategories.length > 0 && (
          <div className="border-t border-[var(--border-silk)] mt-2">
            <div className="w-full sm:px-6 lg:px-12 lg:max-w-[1600px] lg:mx-auto">
              <div className="flex items-center overflow-x-auto gap-4 sm:gap-6 py-3 hide-scrollbar md:justify-center">
                {/* "For You" Circle */}
                <Link
                  href="/collections"
                  className={cn(
                    "flex items-center gap-2 shrink-0 transition-all duration-300 ml-4 luxury-link",
                    compactCategories ? "px-4 py-1.5 rounded-full bg-silk hover:bg-rosegold/10" : "flex-col h-20 justify-center"
                  )}
                >
                  {!compactCategories ? (
                    <>
                      <div className="relative size-12 sm:size-14 rounded-full flex items-center justify-center bg-rosegold text-white shadow-lg shadow-rosegold/30 border-2 border-white transition-transform group-active:scale-95 group-hover:shadow-rosegold/50">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-center leading-tight">For<br/>You</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-rosegold leading-none transition-all">Discovery</span>
                    </>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-widest text-rosegold">For You</span>
                  )}
                </Link>

                {displayCategories.map((category, index) => (
                  <Link
                    key={category.id || index}
                    href={`/collections?category_id=${category.id}`}
                    className={cn(
                      "flex items-center snap-start group shrink-0 transition-all duration-300 luxury-link",
                      compactCategories ? "px-4 py-1.5 rounded-full bg-silk hover:bg-rosegold/10" : "flex-col gap-2 h-20 justify-center"
                    )}
                  >
                    {!compactCategories ? (
                      <>
                        <div className="relative size-12 sm:size-14 rounded-full overflow-hidden bg-white border border-[var(--border-silk)] shadow-sm group-hover:border-rosegold transition-all group-active:scale-95">
                          {category.image_url && category.image_url.trim() !== "" ? (
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-silk text-rosegold/30 text-lg">💎</div>
                          )}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-body group-hover:text-rosegold transition-all leading-none truncate max-w-[70px]">
                          {category.name.split(' ')[0]}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-widest text-body group-hover:text-rosegold transition-all">
                        {category.name.split(' ')[0]}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
