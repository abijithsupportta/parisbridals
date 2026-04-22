import Link from "next/link";
import { Category } from "@/lib/supabase/queries";

interface CategorySectionProps {
  categories: Category[];
}

interface FallbackCategory {
  id?: string;
  name: string;
  slug: string;
  image: string;
  image_url?: string;
}

const fallbackCategories: FallbackCategory[] = [
  { name: "Necklaces", slug: "necklaces", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400" },
  { name: "Earrings", slug: "earrings", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400" },
  { name: "Bangles", slug: "bangles", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400" },
  { name: "Rings", slug: "rings", image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400" },
  { name: "Bridal Sets", slug: "bridal-sets", image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400" },
  { name: "Anklets", slug: "anklets", image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400" },
];

export default function CategorySection({ categories }: CategorySectionProps) {
  const displayCategories: (Category | FallbackCategory)[] =
    categories && categories.length > 0 ? categories : fallbackCategories;

  const categoryItem = (category: Category | FallbackCategory, index: number) => (
    <Link
      key={category.id || index}
      href={`/category/${category.slug}`}
      className="group flex flex-col items-center"
    >
      <div className="relative w-full aspect-square rounded-full overflow-hidden bg-white border-2 border-[var(--border-silk)] shadow-silk transition-all duration-500 group-hover:border-rosegold group-hover:shadow-lg group-hover:shadow-rosegold/10 group-hover:-translate-y-2 mb-4">
        <div className="absolute inset-0 bg-rosegold/0 group-hover:bg-rosegold/5 transition-colors z-10 rounded-full" />
        <img
          src={category.image_url || (category as FallbackCategory).image}
          alt={category.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
      <p className="text-[10px] sm:text-xs font-serif uppercase tracking-[0.12em] text-body group-hover:text-rosegold transition-colors text-center font-medium">
        {category.name}
      </p>
    </Link>
  );

  return (
    <section className="md:py-12 bg-transparent md:bg-silk-dark">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-14 gap-3">
          <div>
            <span className="section-eyebrow">Elevate Your Look</span>
            <h2 className="section-title">
              Shop by <em>Category</em>
            </h2>
          </div>
          <Link
            href="/collections"
            className="text-sm font-medium text-heading hover:text-rosegold transition-all flex items-center gap-2 group"
          >
            Explore Collections{" "}
            <span className="group-hover:translate-x-1.5 transition-transform text-rosegold">
              →
            </span>
          </Link>
        </div>
      </div>

      {/* Mobile: horizontal snap-scroll strip */}
      <div className="md:hidden -mx-5 overflow-x-auto snap-x snap-mandatory hide-scrollbar bg-transparent">
        <div className="flex gap-5 pb-2 pr-5 pl-5 w-max">
          {displayCategories.slice(0, 6).map((category, index) => (
            <div
              key={category.id || index}
              className="snap-start shrink-0"
              style={{ width: "22vw", minWidth: "72px", maxWidth: "104px" }}
            >
              {categoryItem(category, index)}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-8 max-w-7xl mx-auto px-10 stagger-children">
        {displayCategories.slice(0, 6).map((category, index) => categoryItem(category, index))}
      </div>
    </section>
  );
}
