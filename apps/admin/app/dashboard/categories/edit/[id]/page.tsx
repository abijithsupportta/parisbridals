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
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <CategoryForm category={category} allCategories={allCategories} />
      </div>
    </div>
  );
}
