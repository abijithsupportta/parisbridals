import Link from 'next/link';
import { Product, getProductImageUrls } from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary';
  };
}

export default function ProductCard({ product, badge }: ProductCardProps) {
  const imageUrls = getProductImageUrls(product.images);
  const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block"
    >
      {/* Image Container — fixed aspect ratio, image fills & crops */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl sm:rounded-2xl bg-silk-dark">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-rosegold/5">
            <span className="text-4xl opacity-20">💎</span>
          </div>
        )}

        {/* Subtle bottom gradient for depth */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Badge */}
        {badge && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
            <Badge
              variant={badge.variant || 'secondary'}
              className="bg-white/85 backdrop-blur-sm text-rosegold text-[8px] sm:text-[9px] uppercase tracking-widest border-rosegold/15 px-1.5 sm:px-2 py-0.5 shadow-sm"
            >
              {badge.text}
            </Badge>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="mt-2.5 sm:mt-3 text-center px-0.5">
        <h3 className="text-[13px] sm:text-sm md:text-base font-serif text-heading mb-1 sm:mb-1.5 line-clamp-1 group-hover:text-rosegold transition-colors leading-snug">
          {product.name}
        </h3>
        <p className="text-[13px] sm:text-sm md:text-base text-rosegold font-semibold font-serif">
          ₹{product.price_per_day.toLocaleString('en-IN')}<span className="text-[9px] sm:text-[10px] text-caption font-sans ml-0.5">/day</span>
        </p>
      </div>
    </Link>
  );
}
