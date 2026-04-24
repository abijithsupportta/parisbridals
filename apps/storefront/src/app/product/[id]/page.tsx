import { notFound } from "next/navigation";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import ProductDetails from "@/components/product/ProductDetails";
import RelatedProducts from "@/components/product/RelatedProducts";
import { getParisBridalsStore } from "@/lib/actions/store";
import { getProductById, getRelatedProducts, getCategories } from "@/lib/supabase/queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Product — Paris Bridals" };
  return {
    title: `${product.name} — Paris Bridals`,
    description:
      product.description ||
      `Rent ${product.name} from Paris Bridals. Premium bridal jewellery at ₹${product.price_per_day}/day.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;

  const [store, product] = await Promise.all([
    getParisBridalsStore(),
    getProductById(id),
  ]);

  if (!product) {
    notFound();
  }

  // Fetch categories for the header
  const categories = store ? await getCategories(store.id) : [];

  const related = store
    ? await getRelatedProducts(store.id, product.category_id || '', product.id, 8)
    : [];

  return (
    <main className="min-h-screen bg-silk selection:bg-rosegold/20 selection:text-rosegold-dark pb-[72px] lg:pb-0">
      <Header store={store} categories={categories} />

      <ProductDetails
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price_per_day: product.price_per_day,
          security_deposit: product.security_deposit,
          images: product.images || [],
          category: product.category,
          available_quantity: product.available_quantity,
          track_inventory: product.track_inventory,
        }}
      />

      {related.length > 0 && (
        <RelatedProducts
          products={related}
          heading="You May Also Love"
          eyebrow={
            product.category?.name
              ? `More ${product.category.name}`
              : "More from the collection"
          }
        />
      )}

      <Footer store={store} />
    </main>
  );
}
