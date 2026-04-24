import Link from 'next/link';
import { Banner, getBannerLink } from '@/lib/supabase/queries';

interface SplitPromoBannersProps {
  banners: Banner[];
}

export default function SplitPromoBanners({ banners }: SplitPromoBannersProps) {
  // Use banners from DB — take first 2
  const displayBanners = banners.slice(0, 2);

  if (displayBanners.length === 0) return null;

  return (
    <section className="py-6 sm:py-8 md:py-12 px-6 md:px-12 bg-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 stagger-children">
          {displayBanners.map((banner, index) => {
            const hasTitle = !!banner.title;
            const hasSubtitle = !!banner.subtitle;
            const hasCTA = !!banner.call_to_action;
            const hasContent = hasTitle || hasSubtitle || hasCTA;

            const BannerInner = (
              <div className="group relative w-full h-48 sm:h-56 md:h-64 rounded-[2.5rem] overflow-hidden">
                <img
                  src={banner.mobile_image_url || banner.web_image_url}
                  alt={banner.alt_text || banner.title || 'Promo Banner'}
                  className="w-full h-full object-cover object-center sm:hidden"
                />
                <img
                  src={banner.web_image_url}
                  alt={banner.alt_text || banner.title || 'Promo Banner'}
                  className="w-full h-full object-cover object-center hidden sm:block"
                />

                {hasContent && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                )}

                {hasContent && (
                  <div className="absolute inset-0 flex flex-col justify-end px-6 pb-8 sm:px-8 sm:pb-8 md:px-10 md:pb-8 lg:px-12">
                    <div className="text-white relative z-10">
                      {(hasCTA || getBannerLink(banner)) && (
                        <div className="animate-fadeInUp">
                          <div className="inline-block px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 lg:px-8 lg:py-3.5 rounded-full text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium tracking-wide bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all">
                            {banner.call_to_action || 'Explore'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );

            return (
              <div key={banner.id || index}>
                {(() => {
                  const link = getBannerLink(banner);
                  return link ? (
                    <Link href={link} className="block">
                      {BannerInner}
                    </Link>
                  ) : (
                    BannerInner
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
