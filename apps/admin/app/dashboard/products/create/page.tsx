/**
 * Create Product Page
 *
 * Server component that fetches categories and branches,
 * then passes them to the ProductForm.
 *
 * @route /dashboard/products/create
 */

import ProductForm from "@/components/admin/ProductForm";
import { getCategories } from "@/lib/supabase/categories";
import { createClient } from "@/lib/supabase/server";

async function getBranches() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, address, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
  return data || [];
}

export default async function CreateProductPage() {
  const [categories, branches] = await Promise.all([
    getCategories(),
    getBranches(),
  ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <ProductForm categories={categories} branches={branches} />
      </div>
    </div>
  );
}
