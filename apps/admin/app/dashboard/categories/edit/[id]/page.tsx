"use client";

import { useParams, useRouter } from "next/navigation";
import CategoryForm from "@/components/admin/CategoryForm";
import { useCategory, useCategories } from "@/hooks";
import { Loader2, Folder } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { category, isLoading: isCategoryLoading } = useCategory(id);
  const { categories: allCategories, isLoading: isCategoriesLoading } = useCategories();

  const isLoading = isCategoryLoading || isCategoriesLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12 min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (!category && !isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto mt-12">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Folder className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            Category Not Found
          </h3>
          <p className="mb-6 text-sm text-slate-500 max-w-sm">
            The category you are trying to edit does not exist or has been removed.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/categories")}
          >
            Return to Categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <CategoryForm category={category!} allCategories={allCategories} />
      </div>
    </div>
  );
}
