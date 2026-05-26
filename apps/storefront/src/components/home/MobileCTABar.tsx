"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { Store } from "@/lib/supabase/queries";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface MobileCTABarProps {
  store: Store | null;
}

export default function MobileCTABar({ store }: MobileCTABarProps) {
  const whatsappUrl = buildWhatsAppUrl("Hi, I'm interested in renting jewellery from Paris Bridals.");

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--border-silk)] safe-area-bottom shadow-[0_-4px_24px_rgba(183,110,121,0.08)]">
      <div className="flex items-center gap-3 px-4 py-3">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 flex-1 py-3 rounded-full border border-[var(--border-silk)] text-heading text-sm font-medium hover:border-rosegold hover:text-rosegold transition-all"
            aria-label="Contact on WhatsApp"
          >
            <Phone size={15} strokeWidth={1.5} />
            <span className="text-xs tracking-wide">WhatsApp</span>
          </a>
        )}
        <Link
          href="/collections"
          className="shimmer-btn flex-[2] flex items-center justify-center py-3 rounded-full text-white text-xs font-semibold tracking-[0.1em] uppercase"
        >
          Explore Collections
        </Link>
      </div>
    </div>
  );
}
