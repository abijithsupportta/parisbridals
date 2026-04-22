"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const storeName = store?.name || "Paris Bridals";
  const logoUrl = store?.logo_url || "/paris-bridals-logo.jpeg";

  const displayCategories = categories?.length ? categories : [
    { id: "1", name: "Bridal Sets", slug: "bridal-sets", image_url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400" },
    { id: "2", name: "Necklaces", slug: "necklaces", image_url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400" },
    { id: "3", name: "Earrings", slug: "earrings", image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400" },
    { id: "4", name: "Bangles", slug: "bangles", image_url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400" },
    { id: "5", name: "Rings", slug: "rings", image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400" },
  ];

  const navLinks = [
    { label: "Collections", href: "/collections" },
    { label: "Bridal", href: "/collections?category=bridal" },
    { label: "About", href: "/about" },
  ];

  return (
    <>
      <nav
        className={cn(
          "sticky top-0 z-50 transition-all duration-700 border-b bg-white",
          isScrolled ? "py-2 border-[var(--border-silk)] shadow-silk" : "py-4 border-transparent"
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
              {/* Desktop Search Bar */}
              <div className="hidden md:block flex-1 max-w-[400px]">
                <ActionSearchBar />
              </div>

              {/* Mobile Search Bar */}
              <div className="md:hidden flex-1">
                <form onSubmit={(e) => { e.preventDefault(); }} className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full h-9 pl-9 pr-4 rounded-full border border-[var(--border-silk)] bg-white/50 backdrop-blur-md text-xs focus:outline-none focus:ring-2 focus:ring-rosegold/5 focus:border-rosegold transition-all"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 h-4 w-4" strokeWidth={1.5} />
                </form>
              </div>

              <div className="flex items-center gap-1 hidden sm:flex">
                <Link
                  href="/wishlist"
                  className="hidden sm:flex p-2.5 text-body hover:text-rosegold transition-all hover:bg-rosegold/5 rounded-full"
                  aria-label="Favorites"
                >
                  <Heart size={20} strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Category Bar */}
        <div className="border-t border-[var(--border-silk)] mt-2">
          <div className="w-full sm:px-6 lg:px-12 lg:max-w-[1600px] lg:mx-auto">
            <div className="flex items-center overflow-x-auto gap-4 sm:gap-6 py-3 hide-scrollbar md:justify-center">
              {/* "For You" Circle */}
              <Link
                href="/collections?filter=for-you"
                className={cn(
                  "flex items-center gap-2 shrink-0 transition-all duration-300 ml-4",
                  isScrolled ? "px-4 py-2 rounded-full bg-silk hover:bg-rosegold/10" : "flex-col"
                )}
              >
                {!isScrolled ? (
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
                  href={`/collections?category=${category.slug}`}
                  className={cn(
                    "flex items-center snap-start group shrink-0 transition-all duration-300",
                    isScrolled ? "px-4 py-2 rounded-full bg-silk hover:bg-rosegold/10" : "flex-col gap-2"
                  )}
                >
                  {!isScrolled ? (
                    <>
                      <div className="relative size-12 sm:size-14 rounded-full overflow-hidden bg-white border border-[var(--border-silk)] shadow-sm group-hover:border-rosegold transition-all group-active:scale-95">
                        <img
                          src={category.image_url || "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400"}
                          alt={category.name}
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                        />
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
      </nav>
    </>
  );
}
