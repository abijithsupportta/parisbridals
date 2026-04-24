/**
 * Edit Product Page
 *
 * Server component that fetches the product, categories, and branches,
 * then passes them to the ProductForm in edit mode.
 *
 * @route /dashboard/products/[id]/edit
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import { categoryService } from "@/services";
import { productService } from "@/services";
import { branchService } from "@/services";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const [productResult, categoriesResult, branchesResult] = await Promise.all([
    productService.getProductById(id),
    categoryService.getAllCategories(),
    branchService.getBranches(),
  ]);

  if (!productResult.success || !productResult.data) {
    notFound();
  }

  const categories = categoriesResult.success ? categoriesResult.data || [] : [];
  const branches = branchesResult.success ? branchesResult.data || [] : [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <ProductForm
          product={productResult.data}
          categories={categories}
          branches={branches}
        />
      </div>
    </div>
  );
}
