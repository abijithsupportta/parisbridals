/**
 * Create Category Page
 *
 * Supports pre-selecting a parent via the `?parent=<uuid>` query string. When
 * the user clicks "Add Subcategory" on a Main category's detail page or
 * "Add Variant" on a Sub category's detail page, we navigate here with the
 * parent id pre-filled so the new record lands in the correct hierarchy slot.
 *
 * Route: /dashboard/categories/create[?parent=<uuid>]
 *
 * @module app/dashboard/categories/create/page
 */

import { categoryService } from "@/services";
import CategoryForm from "@/components/admin/CategoryForm";

interface PageProps {
  searchParams: Promise<{ parent?: string }>;
}

export default async function CreateCategoryPage({ searchParams }: PageProps) {
  const { parent } = await searchParams;
  const allCategoriesResult = await categoryService.getAllCategories();
  const allCategories = allCategoriesResult.success ? allCategoriesResult.data || [] : [];

  // Validate and resolve the parent hint. If the parent id is a Variant we
  // silently drop it because variants cannot have children.
  let defaultParentId: string | null = null;
  let parentContextLabel: string | null = null;
  if (parent) {
    const parentCat = allCategories.find((c) => c.id === parent);
    if (parentCat) {
      // Get parent with relations to check level
      const parentResult = await categoryService.getCategoryById(parent);
      if (parentResult.success && parentResult.data) {
        const parentLevel = parentResult.data.level;
        if (parentLevel !== "variant") {
          defaultParentId = parentCat.id;
          parentContextLabel =
            parentLevel === "main"
              ? `Adding Subcategory under "${parentCat.name}"`
              : `Adding Variant under "${parentCat.name}"`;
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create Category</h1>
        <p className="text-slate-500 mt-1">
          {parentContextLabel ?? "Add a new Main, Sub, or Variant category"}
        </p>
      </div>
      <CategoryForm
        allCategories={allCategories}
        defaultParentId={defaultParentId}
      />
    </div>
  );
}
