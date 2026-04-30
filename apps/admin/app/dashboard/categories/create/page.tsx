"use client";

import { useSearchParams } from "next/navigation";
import CategoryForm from "@/components/admin/CategoryForm";
import { useCategories } from "@/hooks";
import { Loader2 } from "lucide-react";
import { useMemo, Suspense } from "react";

function CreateCategoryContent() {
  const searchParams = useSearchParams();
  const parent = searchParams.get("parent");
  const { categories: allCategories, isLoading } = useCategories();

  // Validate and resolve the parent hint. If the parent id is a Variant we
  // silently drop it because variants cannot have children.
  const defaultParentId = useMemo(() => {
    if (!parent) return null;
    const parentCat = allCategories.find((c) => c.id === parent);
    if (!parentCat) return null;
    
    // Check level (main or sub is fine, variant is not)
    // If it has no parent, it's a main. If its parent has no parent, it's a sub.
    const isVariant = parentCat.parent_id && allCategories.find((c) => c.id === parentCat.parent_id)?.parent_id;
    if (isVariant) return null;

    return parentCat.id;
  }, [parent, allCategories]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12 min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <CategoryForm
          allCategories={allCategories}
          defaultParentId={defaultParentId}
        />
      </div>
    </div>
  );
}

export default function CreateCategoryPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center p-12 min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
      </div>
    }>
      <CreateCategoryContent />
    </Suspense>
  );
}
