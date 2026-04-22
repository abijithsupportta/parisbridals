import Link from 'next/link';
import { Product } from '@/lib/supabase/queries';
import ProductCard from '@/components/product/ProductCard';

interface FeaturedProductsProps {
  products: Product[];
}

const fallbackProducts: Product[] = [
  {
    id: 'f1',
    name: 'Pearl Choker Set',
    slug: 'pearl-choker-set',
    price_per_day: 1499,
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    security_deposit: 0,
    sizes: [],
    colors: [],
    subcategory_id: '',
    subvariant_id: '',
    track_inventory: false,
    low_stock_threshold: 0,
    total_rentals: 0,
    avg_rating: 0,
    reviews_count: 0,
    total_revenue: 0,
    last_rented_at: null,
    barcode: '',
  },
  {
    id: 'f2',
    name: 'Kundan Necklace',
    slug: 'kundan-necklace',
    price_per_day: 2499,
    images: ['https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    security_deposit: 0,
    sizes: [],
    colors: [],
    subcategory_id: '',
    subvariant_id: '',
    track_inventory: false,
    low_stock_threshold: 0,
    total_rentals: 0,
    avg_rating: 0,
    reviews_count: 0,
    total_revenue: 0,
    last_rented_at: null,
    barcode: '',
  },
  {
    id: 'f3',
    name: 'Temple Jewellery Set',
    slug: 'temple-jewellery-set',
    price_per_day: 1999,
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    security_deposit: 0,
    sizes: [],
    colors: [],
    subcategory_id: '',
    subvariant_id: '',
    track_inventory: false,
    low_stock_threshold: 0,
    total_rentals: 0,
    avg_rating: 0,
    reviews_count: 0,
    total_revenue: 0,
    last_rented_at: null,
    barcode: '',
  },
  {
    id: 'f4',
    name: 'Diamond Earrings',
    slug: 'diamond-earrings',
    price_per_day: 999,
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    security_deposit: 0,
    sizes: [],
    colors: [],
    subcategory_id: '',
    subvariant_id: '',
    track_inventory: false,
    low_stock_threshold: 0,
    total_rentals: 0,
    avg_rating: 0,
    reviews_count: 0,
    total_revenue: 0,
    last_rented_at: null,
    barcode: '',
  },
];

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  const displayProducts = products && products.length > 0 ? products : fallbackProducts;

  return (
    <section className="py-6 sm:py-8 md:py-12 px-6 md:px-12 bg-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 sm:mb-6 md:mb-8 gap-4 sm:gap-6">
          <div className="animate-fadeInUp">
            <span className="section-eyebrow">Exclusively for You</span>
            <h2 className="section-title">
              Featured <em>Masterpieces</em>
            </h2>
          </div>
          <Link 
            href="/collections?featured=true" 
            className="text-sm font-medium text-heading hover:text-rosegold transition-all ml-auto md:ml-0 flex items-center gap-2 group animate-fadeInUp"
          >
            Browse Collections <span className="group-hover:translate-x-1.5 transition-transform text-rosegold">→</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 stagger-children">
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={{ text: 'Featured' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
