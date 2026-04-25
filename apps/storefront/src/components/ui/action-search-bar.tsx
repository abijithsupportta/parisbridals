"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Send, X, Package, Sparkles, Tag, Heart, Truck, BookOpen, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ProductSuggestion {
  id: string;
  name: string;
  category_name?: string;
}

interface SearchAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  href: string;
  color: string;
}

interface ActionSearchBarProps {
  storeId?: string;
}

const QUICK_ACTIONS: SearchAction[] = [
  {
    id: "products",
    label: "All Collections",
    icon: <Package className="w-5 h-5" />,
    description: "Browse our entire catalog",
    href: "/collections",
    color: "text-sky-500"
  },
  {
    id: "new",
    label: "New Arrivals",
    icon: <Tag className="w-5 h-5" />,
    description: "Latest additions",
    href: "/collections?sort=new",
    color: "text-orange-500"
  },
  {
    id: "wishlist",
    label: "Wishlist",
    icon: <Heart className="w-5 h-5" />,
    description: "Your saved items",
    href: "/wishlist",
    color: "text-red-500"
  },
  {
    id: "cart",
    label: "Enquiry Cart",
    icon: <ShoppingBag className="w-5 h-5" />,
    description: "Your selection for enquiry",
    href: "/cart",
    color: "text-emerald-500"
  },
];

export default function ActionSearchBar({ storeId }: ActionSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [filteredActions, setFilteredActions] = useState<SearchAction[]>(QUICK_ACTIONS);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce filter
  useEffect(() => {
    if (!query.trim()) {
      setFilteredActions(QUICK_ACTIONS);
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      // Filter actions
      const filtered = QUICK_ACTIONS.filter(action =>
        action.label.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredActions(filtered);

      // Fetch product suggestions
      setIsLoading(true);
      try {
        let queryBuilder = supabase
          .from("products")
          .select("id, name, category:category_id(name)")
          .ilike("name", `%${query}%`)
          .limit(5);
        
        if (storeId) {
          queryBuilder = queryBuilder.eq("store_id", storeId);
        }

        const { data, error } = await queryBuilder;

        if (!error && data) {
          setSuggestions(data.map((p: any) => ({
            id: p.id,
            name: p.name,
            category_name: p.category?.name
          })));
        }
      } catch (err) {
        console.error("Search suggestion error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, storeId, supabase]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/collections?q=${encodeURIComponent(query.trim())}`);
      setIsDropdownOpen(false);
      setQuery("");
    }
  };

  const handleActionClick = (action: SearchAction) => {
    router.push(action.href);
    setIsDropdownOpen(false);
    setQuery("");
  };

  return (
    <>
      {/* Desktop Search Bar */}
      <div className="hidden md:block relative" ref={dropdownRef}>
        <form onSubmit={handleSearch} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Find your bridal masterpiece..."
            className="w-full h-11 pl-12 pr-12 rounded-full border border-[var(--border-silk)] bg-white/50 backdrop-blur-md text-sm focus:outline-none focus:ring-4 focus:ring-rosegold/5 focus:border-rosegold transition-all duration-300 placeholder:text-muted-foreground/50 shadow-sm"
          />
          
          {/* Animated Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {query ? (
              <Send className="w-5 h-5 text-rosegold animate-in zoom-in duration-150" strokeWidth={1.5} />
            ) : (
              <Search className="w-5 h-5 text-muted-foreground animate-in zoom-in duration-150" strokeWidth={1.5} />
            )}
          </div>

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsDropdownOpen(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-rosegold transition-colors animate-in fade-in duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Quick Actions Dropdown */}
        {isDropdownOpen && (query || filteredActions.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-[var(--border-silk)] p-3 z-50 animate-in slide-in-from-top-2 fade-in duration-200 min-w-[400px]">
            <div className="space-y-4">
              {/* Product Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-caption mb-2 ml-2">Suggested Products</div>
                  <div className="space-y-1">
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          router.push(`/product/${product.id}`);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2 rounded-xl hover:bg-silk transition-all duration-200 text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <Package size={14} className="text-muted-foreground group-hover:text-rosegold" />
                          <span className="text-sm text-heading group-hover:text-rosegold transition-colors">{product.name}</span>
                        </div>
                        {product.category_name && (
                          <span className="text-[10px] text-caption uppercase tracking-wider">{product.category_name}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {filteredActions.length > 0 && (
                <div>
                  {suggestions.length > 0 && <div className="border-t border-[var(--border-silk)] my-3" />}
                  <div className="text-[10px] uppercase tracking-widest font-bold text-caption mb-2 ml-2">Quick Actions</div>
                  <div className="space-y-1">
                    {filteredActions.map((action, index) => (
                      <button
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-silk transition-all duration-200 text-left group",
                        )}
                      >
                        <div className={cn("p-1.5 rounded-lg bg-silk-dark/30 group-hover:bg-white transition-colors", action.color)}>
                          {action.icon}
                        </div>
                        <div className="text-sm font-medium text-heading group-hover:text-rosegold transition-colors">
                          {action.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {!isLoading && suggestions.length === 0 && filteredActions.length === 0 && query && (
                <div className="p-4 text-center text-sm text-caption italic">No matches found for "{query}"</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Search Trigger */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden p-2.5 text-heading hover:text-rosegold hover:bg-rosegold/5 rounded-full transition-all"
        aria-label="Search"
      >
        <Search size={22} strokeWidth={1.5} />
      </button>

      {/* Mobile Search Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col lg:hidden animate-in fade-in duration-300">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-text-heading/40 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Search Panel */}
          <div className="relative bg-white rounded-b-[2.5rem] shadow-2xl z-10 animate-in slide-in-from-top-full duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="flex flex-col p-6 pt-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-serif text-heading">Find something <em>special</em></h3>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 -mr-2 text-muted-foreground hover:text-rosegold transition-colors"
                >
                  <X size={24} strokeWidth={1.5} />
                </button>
              </div>

              <form onSubmit={handleSearch} className="relative mb-8">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for treasures..."
                  className="w-full h-14 pl-14 pr-6 rounded-2xl bg-silk border border-[var(--border-silk)] text-base focus:outline-none focus:ring-4 focus:ring-rosegold/5 focus:border-rosegold transition-all"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/60 h-6 w-6" strokeWidth={1.5} />

                {query.trim() && (
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-rosegold text-white px-5 py-2.5 rounded-xl text-sm font-bold animate-in fade-in zoom-in duration-300 shadow-lg shadow-rosegold/20"
                  >
                    Search
                  </button>
                )}
              </form>

              {/* Search Suggestions */}
              {query.trim() && suggestions.length > 0 && (
                <div className="mb-8">
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">
                    Product Matches
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          router.push(`/product/${product.id}`);
                          setIsMobileOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-4 rounded-xl bg-silk-dark/30 hover:bg-rosegold/10 transition-all active:scale-[0.98] text-left"
                      >
                        <div className="flex items-center gap-4">
                          <Package size={18} className="text-rosegold" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-heading line-clamp-1">{product.name}</span>
                            {product.category_name && (
                              <span className="text-[10px] text-caption uppercase tracking-wider">{product.category_name}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-4 pb-10">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">
                  Quick Actions
                </div>
                <div className="space-y-2">
                  {filteredActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        router.push(action.href);
                        setIsMobileOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-silk-dark/30 hover:bg-rosegold/10 transition-all active:scale-[0.98]"
                    >
                      <div className={cn("p-2.5 rounded-xl bg-white shadow-sm", action.color)}>
                        {action.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-heading">{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-muted-foreground">{action.description}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
