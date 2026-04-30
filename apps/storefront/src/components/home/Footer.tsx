import Link from "next/link";
import { Instagram, Facebook, Twitter, Mail, Phone } from "lucide-react";
import { Store } from "@/lib/supabase/queries";
import { Separator } from "@/components/ui/separator";
import { DISPLAY_PHONE, WHATSAPP_NUMBER } from "@/lib/whatsapp";

interface FooterProps {
  store: Store | null;
}

export default function Footer({ store }: FooterProps) {
  const storeName = store?.name || "Paris Bridals";
  const storeEmail = store?.email || "hello@parisbridals.com";
  const storePhone = DISPLAY_PHONE;

  return (
    <footer className="bg-white border-t border-border-silk pt-8 sm:pt-12 md:pt-16 pb-6 sm:pb-8">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-10">
          <div className="lg:col-span-1">
            <Link href="/" className="block mb-4 sm:mb-6 group">
              <span className="text-xl sm:text-2xl font-serif text-rosegold tracking-[0.1em] uppercase transition-colors">{storeName}</span>
            </Link>
            <p className="text-sm text-body font-light leading-relaxed mb-4 sm:mb-6 max-w-xs">
              Crafting timeless beauty for those who celebrate life's most precious beginning. Luxury bridal jewellery, defined by elegance.
            </p>
            <div className="flex gap-3 sm:gap-4 md:gap-5">
              {[Instagram, Facebook, Twitter].map((Icon, idx) => (
                <a 
                  key={idx} 
                  href="#" 
                  className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full border border-border-silk flex items-center justify-center text-heading hover:bg-rosegold hover:text-white hover:border-rosegold transition-all duration-500 shadow-sm"
                >
                  <Icon size={14} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-rosegold mb-4 sm:mb-6">Collections</h4>
            <ul className="space-y-2 sm:space-y-3">
              {["Necklaces", "Rings", "Earrings", "Sets", "Bangles"].map((item) => (
                <li key={item}>
                  <Link href={`/collections`} className="text-sm text-body font-light hover:text-rosegold transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-rosegold mb-4 sm:mb-6">Concierge</h4>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { label: "Our Story", href: "/about" },
                { label: "Privé Membership", href: "/membership" },
                { label: "FAQs", href: "/faqs" },
                { label: "Policies", href: "/legal/terms" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-body font-light hover:text-rosegold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-rosegold mb-4 sm:mb-6">Get in Touch</h4>
            <ul className="space-y-3 sm:space-y-4">
              <li className="flex gap-3 sm:gap-4 items-start group">
                <div className="w-8 h-8 rounded-full bg-rosegold/5 flex items-center justify-center group-hover:bg-rosegold transition-colors duration-500 shrink-0">
                  <Mail size={14} className="text-rosegold group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-caption mb-1">Email</p>
                  <a href={`mailto:${storeEmail}`} className="text-sm text-heading font-medium hover:text-rosegold transition-colors">
                    {storeEmail}
                  </a>
                </div>
              </li>
              {storePhone && (
                <li className="flex gap-3 sm:gap-4 items-start group">
                  <div className="w-8 h-8 rounded-full bg-rosegold/5 flex items-center justify-center group-hover:bg-rosegold transition-colors duration-500 shrink-0">
                    <Phone size={14} className="text-rosegold group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-caption mb-1">Phone</p>
                    <a href={`tel:${storePhone}`} className="text-sm text-heading font-medium hover:text-rosegold transition-colors">
                      {storePhone}
                    </a>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        <Separator className="bg-border-silk mb-8 sm:mb-12" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8">
          <p className="text-[9px] uppercase tracking-[0.3em] text-caption text-center sm:text-left">
            © 2026 {storeName}. Handcrafted with Love.
          </p>
          <div className="flex gap-6 sm:gap-10">
            <Link href="/legal/terms" className="text-[9px] uppercase tracking-[0.3em] text-caption hover:text-rosegold transition-colors">Terms of Service</Link>
            <Link href="/legal/privacy" className="text-[9px] uppercase tracking-[0.3em] text-caption hover:text-rosegold transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
