import { notFound } from "next/navigation";
import { getCategoryById, getCategories } from "@/lib/supabase/categories";
import CategoryForm from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await getCategoryById(id);

  if (!category) {
    notFound();
  }

  const allCategories = await getCategories();

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
