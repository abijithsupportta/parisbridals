import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FinalCTA() {
  return (
    <section className="bg-silk py-6 sm:py-8 md:py-12 px-6 md:px-12 relative overflow-hidden">
      {/* Decorative large silk glow/flare */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-rosegold/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1600px] mx-auto text-center relative z-10">
        <div className="animate-fadeInUp">
          <span className="section-eyebrow justify-center after:content-[''] after:w-8 after:h-px after:bg-rosegold-light">Your Masterpiece Awaits</span>
          <h2 className="text-3xl sm:text-5xl md:text-8xl font-serif text-heading mb-4 sm:mb-6 md:mb-8 tracking-tight leading-[1.3] md:leading-[1.2]">
            Complete Your <br className="hidden sm:block" /> <em>Bridal Ensemble</em>
          </h2>
          <p className="text-sm sm:text-lg md:text-xl text-body font-light mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            Discover our curated collection of luxury jewellery, handcrafted to make your special day truly unforgettable. Elegance is just a click away.
          </p>
        </div>

        <div className="flex justify-center animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <Link href="/collections">
            <Button className="shimmer-btn px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 lg:px-12 lg:py-7 rounded-full text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold border-none shadow-2xl">
              Explore Collections
            </Button>
          </Link>
        </div>
        
        {/* Decorative side accents */}
        <div className="hidden lg:block absolute top-10 left-0 w-32 h-px bg-gradient-to-r from-rosegold/30 to-transparent" />
        <div className="hidden lg:block absolute bottom-10 right-0 w-32 h-px bg-gradient-to-l from-rosegold/30 to-transparent" />
      </div>
    </section>
  );
}
