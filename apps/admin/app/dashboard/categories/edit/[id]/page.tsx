import { notFound } from "next/navigation";
import { categoryService } from "@/services";
import CategoryForm from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryResult = await categoryService.getCategoryById(id);

  if (!categoryResult.success || !categoryResult.data) {
    notFound();
  }

  const category = categoryResult.data;
  const allCategoriesResult = await categoryService.getAllCategories();
  const allCategories = allCategoriesResult.success ? allCategoriesResult.data || [] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Category</h1>
        <p className="text-slate-500 mt-1">Update category details and image</p>
      </div>
      <CategoryForm category={category} allCategories={allCategories} />
    </div>
  );
}
