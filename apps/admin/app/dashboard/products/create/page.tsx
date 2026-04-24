/**
 * Create Product Page
 *
 * Server component that fetches categories and branches,
 * then passes them to the ProductForm.
 *
 * @route /dashboard/products/create
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import { categoryService } from "@/services";
import { branchService } from "@/services";

export default async function CreateProductPage() {
  const [categoriesResult, branchesResult] = await Promise.all([
    categoryService.getAllCategories(),
    branchService.getBranches(),
  ]);

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
        <ProductForm categories={categories} branches={branches} />
      </div>
    </div>
  );
}
