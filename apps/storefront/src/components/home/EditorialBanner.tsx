import Link from 'next/link';
import { Banner, getBannerLink } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';

interface EditorialBannerProps {
  banners: Banner[];
}

export default function EditorialBanner({ banners }: EditorialBannerProps) {
  // Find first banner that has a title/subtitle (editorial-like) or just the first one
  const editorialBanner = banners.find(b => b.title && b.subtitle) || banners[0];

  if (!editorialBanner) return null;

  const hasContent = !!editorialBanner.title || !!editorialBanner.subtitle || !!editorialBanner.call_to_action;

  const BannerContent = (
    <div className="group relative w-full aspect-[21/10] md:aspect-[28/10] rounded-[2.5rem] overflow-hidden">
      <img
        src={editorialBanner.mobile_image_url || editorialBanner.web_image_url}
        alt={editorialBanner.alt_text || editorialBanner.title || 'Editorial Banner'}
        className="w-full h-full object-cover object-center sm:hidden"
      />
      <img
        src={editorialBanner.web_image_url}
        alt={editorialBanner.alt_text || editorialBanner.title || 'Editorial Banner'}
        className="w-full h-full object-cover object-center hidden sm:block"
      />
      {hasContent && (
        <div className="absolute inset-0 bg-gradient-to-t from-text-heading/80 via-text-heading/20 to-transparent md:bg-gradient-to-r md:from-text-heading/60 md:via-text-heading/10 md:to-transparent flex flex-col justify-end px-6 pb-12 md:px-14 md:pb-10 lg:px-20 text-white">
          <div className="max-w-2xl text-left">
            {editorialBanner.title && (
              <span className="section-eyebrow text-rosegold-lighter before:bg-rosegold-lighter/50 mb-4 md:mb-6 animate-fadeInUp">
                {editorialBanner.title}
              </span>
            )}
            {editorialBanner.subtitle && (
              <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-serif mb-5 sm:mb-6 md:mb-8 tracking-tight leading-[1.1] animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                {editorialBanner.subtitle}
              </h2>
            )}
            {editorialBanner.call_to_action && (
              <div className="animate-fadeInUp absolute bottom-8 left-4 sm:bottom-8 sm:left-6 md:bottom-8 md:left-8 lg:bottom-8 lg:left-10" style={{ animationDelay: '0.2s' }}>
                <Button className="shimmer-btn px-4 py-2 sm:px-5 sm:py-2.5 md:px-8 md:py-3 lg:px-10 lg:py-3.5 rounded-full text-[9px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-[0.2em] font-bold border-none">
                  {editorialBanner.call_to_action}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section className="py-6 sm:py-8 md:py-12 px-6 md:px-12 bg-white">
      <div className="max-w-[1600px] mx-auto">
        {(() => {
          const link = getBannerLink(editorialBanner);
          return link ? (
            <Link href={link} className="block">
              {BannerContent}
            </Link>
          ) : (
            BannerContent
          );
        })()}
      </div>
    </section>
  );
}
