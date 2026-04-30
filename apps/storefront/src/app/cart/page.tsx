"use client";

import { useState, useEffect } from "react";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, Calendar } from "lucide-react";
import { buildWishlistMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import Link from "next/link";

interface CartItem {
  id: string;
  name: string;
  price_per_day: number;
  images: string[];
}

export default function CartPage() {
  const [store, setStore] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStore() {
      const storeData = await getParisBridalsStore();
      setStore(storeData);
    }
    loadStore();

    // Load cart from localStorage
    const saved = localStorage.getItem("paris_cart");
    if (saved) {
      setCartItems(JSON.parse(saved));
    }
    setMounted(true);
  }, []);

  const removeFromCart = (id: string) => {
    const updated = cartItems.filter((item) => item.id !== id);
    setCartItems(updated);
    localStorage.setItem("paris_cart", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("paris_cart_updated", { detail: updated.length }));
  };

  const bookViaWhatsApp = () => {
    if (!startDate || !endDate) {
      setError("Please select rental start and end dates");
      return;
    }
    setError("");

    const items = cartItems.map((item) => ({
      name: item.name,
      price: item.price_per_day,
      startDate,
      endDate,
    }));
    const message = buildWishlistMessage(items);
    window.open(buildWhatsAppUrl(message), "_blank");
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />

      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-12">
            <div className="section-eyebrow justify-center">Selection Cart</div>
            <h1 className="text-4xl sm:text-5xl font-serif text-heading mb-4">Enquiry Cart</h1>
            <p className="text-body font-light">
              {cartItems.length} {cartItems.length === 1 ? "piece" : "pieces"} selected for your event
            </p>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-rosegold/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag size={32} className="text-rosegold" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-serif text-heading mb-4">Your enquiry cart is empty</h2>
              <p className="text-body mb-8 max-w-md mx-auto">
                Discover our treasures and add them to your cart for a quick availability enquiry.
              </p>
              <Link href="/collections">
                <Button className="shimmer-btn px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold">
                  Explore Collections
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Date Selection Bar */}
              <div className="max-w-xl mx-auto mb-10 bg-white p-6 rounded-[2rem] shadow-silk border border-[var(--border-silk)]">
                <div className="flex items-center gap-2 mb-4 text-rosegold">
                  <Calendar size={18} />
                  <span className="text-xs uppercase font-bold tracking-widest">Rental Period</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-body font-semibold block mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-silk border border-[var(--border-silk)] rounded-full text-sm focus:outline-none focus:border-rosegold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-body font-semibold block mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      min={startDate || new Date().toISOString().split('T')[0]}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-silk border border-[var(--border-silk)] rounded-full text-sm focus:outline-none focus:border-rosegold"
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-red-500 mt-4 text-center">{error}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[var(--border-silk)] group hover:shadow-silk transition-all duration-500"
                  >
                    <div className="relative aspect-square">
                      {item.images?.[0] && (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-rosegold hover:bg-rosegold hover:text-white transition-all shadow-sm"
                        aria-label="Remove from cart"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-heading text-lg mb-2 line-clamp-2">{item.name}</h3>
                      <p className="text-body text-sm mb-3">₹{item.price_per_day.toLocaleString("en-IN")}/day</p>
                      <Link href={`/product/${item.id}`}>
                        <Button variant="outline" className="w-full py-3 rounded-full text-xs uppercase tracking-widest font-bold border-rosegold text-rosegold hover:bg-rosegold hover:text-white transition-all">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="fixed bottom-24 left-3 right-3 p-4 bg-white/95 backdrop-blur-md border border-[var(--border-silk)] rounded-2xl lg:hidden z-40 shadow-lg">
                <Button
                  onClick={bookViaWhatsApp}
                  className="w-full shimmer-btn py-4 rounded-full text-sm uppercase tracking-widest font-bold flex items-center justify-center gap-3"
                >
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  Enquire via WhatsApp
                </Button>
              </div>

              <div className="hidden lg:flex justify-center">
                <Button
                  onClick={bookViaWhatsApp}
                  className="shimmer-btn px-12 py-5 rounded-full text-sm uppercase tracking-widest font-bold flex items-center gap-3"
                >
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  Enquire Selected via WhatsApp
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer store={store} />
    </main>
  );
}
