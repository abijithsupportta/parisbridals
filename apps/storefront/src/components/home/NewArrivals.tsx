import Link from 'next/link';
import { Product } from '@/lib/supabase/queries';
import ProductCard from '@/components/product/ProductCard';

interface NewArrivalsProps {
  products: Product[];
}

export default function NewArrivals({ products }: NewArrivalsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-6 sm:py-8 md:py-12 px-4 sm:px-6 md:px-12 bg-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 sm:mb-6 md:mb-8 gap-4 sm:gap-6">
          <div className="animate-fadeInUp">
            <span className="section-eyebrow">Just Unveiled</span>
            <h2 className="section-title">
              The <em>New Arrivals</em>
            </h2>
          </div>
          <Link 
            href="/collections?sort=new" 
            className="text-sm font-medium text-heading hover:text-rosegold transition-all ml-auto md:ml-0 flex items-center gap-2 group animate-fadeInUp"
          >
            Explore the Latest <span className="group-hover:translate-x-1.5 transition-transform text-rosegold">→</span>
          </Link>
        </div>
        
        {/* Mobile: 2 cols, Tablet: 3 cols, Desktop: 4 cols — images fill smoothly */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 stagger-children">
          {products.slice(0, 8).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={{ text: 'New' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
