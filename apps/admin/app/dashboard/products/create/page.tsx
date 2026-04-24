/**
 * Create Product Page
 *
 * Server component that fetches categories and branches,
 * then passes them to the ProductForm.
 *
 * @route /dashboard/products/create
 */

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
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ProductForm categories={categories} branches={branches} />
      </div>
    </div>
  );
}
