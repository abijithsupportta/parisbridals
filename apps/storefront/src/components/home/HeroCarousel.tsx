"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Banner, getBannerLink } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  banners: Banner[];
}

export default function HeroCarousel({ banners }: HeroCarouselProps) {
  // Use all banners for hero carousel, sorted by priority (handled by query)
  const heroBanners = banners;

  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 1000);
    },
    [isTransitioning]
  );

  const next = useCallback(() => {
    goTo(current === heroBanners.length - 1 ? 0 : current + 1);
  }, [current, heroBanners.length, goTo]);

  const prev = useCallback(() => {
    goTo(current === 0 ? heroBanners.length - 1 : current - 1);
  }, [current, heroBanners.length, goTo]);

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, heroBanners.length]);

  // Touch swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) next();
    if (distance < -50) prev();
  };

  if (heroBanners.length === 0) return null;

  return (
    <section className="bg-silk py-4 sm:py-6">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10">
        <div
          className="relative w-full aspect-[21/10] md:aspect-[28/10] rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_oklch(0.65_0.12_15_/_18%)] bg-silk-dark border border-white/60"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Slides */}
          <div
            className="flex h-full w-full transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {heroBanners.map((banner) => {
              const hasTitle = !!banner.title;
              const hasSubtitle = !!banner.subtitle;
              const hasCTA = !!banner.call_to_action;
              const hasTextContent = hasTitle || hasSubtitle || hasCTA;

              const SlideInner = (
                <div className="min-w-full h-full relative group">
                  <img
                    src={banner.mobile_image_url || banner.web_image_url}
                    alt={banner.alt_text || banner.title || "Banner"}
                    className="w-full h-full object-cover object-center sm:hidden"
                    loading="eager"
                  />
                  <img
                    src={banner.web_image_url}
                    alt={banner.alt_text || banner.title || "Banner"}
                    className="w-full h-full object-cover object-center hidden sm:block"
                    loading="eager"
                  />

                  {/* Text Overlay */}
                  {hasTextContent && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent md:bg-gradient-to-r md:from-black/55 md:via-black/10 md:to-transparent flex flex-col justify-end px-6 pb-12 sm:px-10 sm:pb-10 md:px-14 md:pb-0 md:items-center lg:px-20">
                      <div className="max-w-xl text-white text-left md:text-center">
                        {hasTitle && (
                          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] font-semibold mb-2 sm:mb-4 block text-rosegold-lighter animate-fadeInUp">
                            {banner.title}
                          </span>
                        )}
                        {hasSubtitle && (
                          <h2
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif mb-5 sm:mb-6 md:mb-8 tracking-tight leading-[1.1] animate-fadeInUp"
                            style={{ animationDelay: "0.15s" }}
                          >
                            {banner.subtitle}
                          </h2>
                        )}
                        {hasCTA && (
                          <div className="animate-fadeInUp absolute bottom-8 left-4 sm:bottom-8 sm:left-6 md:bottom-8 md:left-8 lg:bottom-8 lg:left-10" style={{ animationDelay: "0.3s" }}>
                            <div className="shimmer-btn inline-block px-4 py-2 sm:px-5 sm:py-2.5 md:px-8 md:py-3 lg:px-10 lg:py-3.5 rounded-full text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium tracking-wide">
                              {banner.call_to_action}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );

              const bannerLink = getBannerLink(banner);

              return (
                <div key={banner.id} className="min-w-full h-full">
                  {bannerLink ? (
                    <Link href={bannerLink} className="block w-full h-full">
                      {SlideInner}
                    </Link>
                  ) : (
                    SlideInner
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation Arrows — desktop only */}
          {heroBanners.length > 1 && (
            <>
              <button
                onClick={prev}
                className="hidden md:flex absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 w-11 h-11 lg:w-12 lg:h-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-rosegold hover:border-rosegold transition-all z-30 shadow-xl"
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={next}
                className="hidden md:flex absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 w-11 h-11 lg:w-12 lg:h-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-rosegold hover:border-rosegold transition-all z-30 shadow-xl"
                aria-label="Next slide"
              >
                <ChevronRight size={20} />
              </button>

              {/* Pagination dots */}
              <div className="absolute bottom-4 sm:bottom-5 md:bottom-6 left-1/2 -translate-x-1/2 md:left-14 md:translate-x-0 lg:left-20 z-20">
                <div className="flex gap-2">
                  {heroBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={cn(
                        "h-[3px] rounded-full transition-all duration-500",
                        current === i
                          ? "w-8 sm:w-10 md:w-12 bg-rosegold-light"
                          : "w-3 sm:w-4 bg-white/40 hover:bg-white/60"
                      )}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
