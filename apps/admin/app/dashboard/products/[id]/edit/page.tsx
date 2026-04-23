/**
 * Edit Product Page
 *
 * Server component that fetches the product, categories, and branches,
 * then passes them to the ProductForm in edit mode.
 *
 * @route /dashboard/products/[id]/edit
 */

import ProductForm from "@/components/admin/ProductForm";
import { getCategories } from "@/lib/supabase/categories";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

async function getProduct(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

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

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, branches] = await Promise.all([
    getProduct(id),
    getCategories(),
    getBranches(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <ProductForm
          product={product}
          categories={categories}
          branches={branches}
        />
      </div>
    </div>
  );
}
