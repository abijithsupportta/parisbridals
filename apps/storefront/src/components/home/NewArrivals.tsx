import Link from 'next/link';
import { Product } from '@/lib/supabase/queries';
import ProductCard from '@/components/product/ProductCard';

interface NewArrivalsProps {
  products: Product[];
}

const fallbackProducts: Product[] = [
  {
    id: 'n1',
    name: 'Bridal Set Gold',
    slug: 'bridal-set-gold',
    price_per_day: 3499,
    images: ['https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: false,
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
    id: 'n2',
    name: 'Ruby Necklace',
    slug: 'ruby-necklace',
    price_per_day: 2999,
    images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: false,
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
    id: 'n3',
    name: 'Emerald Earrings',
    slug: 'emerald-earrings',
    price_per_day: 1299,
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: false,
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
    id: 'n4',
    name: 'Sapphire Ring',
    slug: 'sapphire-ring',
    price_per_day: 899,
    images: ['https://images.unsplash.com/photo-1620656798579-198466f97e6e?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: false,
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
    id: 'n5',
    name: 'Antique Bangles',
    slug: 'antique-bangles',
    price_per_day: 1799,
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400'],
    store_id: '',
    category_id: '',
    description: '',
    sku: '',
    quantity: 0,
    available_quantity: 0,
    is_active: true,
    is_featured: false,
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

export default function NewArrivals({ products }: NewArrivalsProps) {
  const displayProducts = products && products.length > 0 ? products : fallbackProducts;

  return (
    <section className="py-6 sm:py-8 md:py-12 px-6 md:px-12 bg-white">
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
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 stagger-children">
          {displayProducts.slice(0, 6).map((product) => (
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
