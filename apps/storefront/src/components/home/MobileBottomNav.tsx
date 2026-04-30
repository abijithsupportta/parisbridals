"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, User, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/collections", label: "Shop", icon: LayoutGrid },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/contact", label: "Support", icon: User },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // We check for product detail pages usually to hide it if they have their own CTA
  const isProductPage = pathname.startsWith("/product/");

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-1 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-[92%] max-w-md animate-in slide-in-from-bottom-10",
        isProductPage && "translate-y-24 opacity-0 pointer-events-none"
      )}
    >
      <div 
        className="flex items-center justify-between h-18 px-3 rounded-[2.5rem] bg-white/95 backdrop-blur-2xl border border-white/50 shadow-[0_20px_50px_-12px_oklch(0.65_0.12_15_/_25%)]"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 flex-1 h-full rounded-[2rem] transition-all duration-300 relative overflow-hidden",
                active ? "text-rosegold" : "text-muted-foreground/80"
              )}
            >
              {/* Active Highlight - Ref: Toy Shop Rounded Square */}
              {active && (
                <div className="absolute inset-1.5 rounded-2xl bg-rosegold/10 animate-in zoom-in-90 fade-in duration-300" />
              )}
              
              <div className={cn(
                "relative z-10 transition-transform duration-300",
                active && "scale-110"
              )}>
                <Icon 
                  size={22} 
                  strokeWidth={active ? 2.5 : 1.5} 
                  className={cn(
                    "transition-all duration-300",
                    active && "drop-shadow-[0_2px_4px_rgba(183,110,121,0.2)]"
                  )}
                />
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-[0.05em] relative z-10 transition-all duration-300",
                active ? "text-rosegold" : "text-muted-foreground/60"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
