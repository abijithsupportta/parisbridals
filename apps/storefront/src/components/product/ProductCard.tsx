import Link from 'next/link';
import { Product, getProductImageUrls } from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ProductCardProps {
  product: Product;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary';
  };
}

export default function ProductCard({ product, badge }: ProductCardProps) {
  const imageUrls = getProductImageUrls(product.images);
  const firstImage = imageUrls[0] || null;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group"
    >
      <Card className="relative aspect-[3/4] overflow-hidden bg-silk border-none shadow-silk hover:shadow-2xl transition-all duration-700 hover:-translate-y-1">
        <CardContent className="p-0 h-full w-full">
          {firstImage ? (
            <img
              src={firstImage}
              alt={product.name}
              className="w-full h-full object-fill transition-transform duration-1000 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-rosegold/5">
              <span className="text-4xl opacity-20">💎</span>
            </div>
          )}

          {badge && (
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
              <Badge variant={badge.variant || 'secondary'} className="bg-silk/80 backdrop-blur-sm text-rosegold text-[8px] sm:text-[9px] uppercase tracking-widest border-rosegold/20 px-1.5 sm:px-2 py-0.5">
                {badge.text}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-2 sm:mt-3 text-center">
        <h3 className="text-sm sm:text-base md:text-lg font-serif text-rosegold mb-1 sm:mb-1.5 line-clamp-2 transition-colors leading-tight">
          {product.name}
        </h3>
        <div className="flex flex-col items-center gap-1 sm:gap-1.5">
          <p className="text-sm sm:text-base md:text-lg text-rosegold font-semibold font-serif">
            ₹{product.price_per_day.toLocaleString()}/day
          </p>
          <p className="text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-caption">
            Available for Rent
          </p>
        </div>
      </div>
    </Link>
  );
}
