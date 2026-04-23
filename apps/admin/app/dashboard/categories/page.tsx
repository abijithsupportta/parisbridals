/**
 * Categories Management Page
 *
 * Displays all product categories in a hierarchical tree view.
 * Hierarchy levels:
 *   - Main Category (no parent)
 *   - Sub Category (parent = main)
 *   - Variant (parent = sub)
 *
 * Each category shows its image, name, status badge, and action buttons.
 * Images are served from Cloudflare R2. Categories without images display
 * a default folder icon placeholder.
 *
 * Route: /dashboard/categories
 *
 * @module app/dashboard/categories/page
 */

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getCategories } from "@/lib/supabase/categories";
import CategoryTree from "@/components/admin/CategoryTree";

/**
 * Async server component that fetches categories and renders the tree view.
 */
export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500 mt-1">Manage Main, Sub, and Variant categories</p>
        </div>
        <Link href="/dashboard/categories/create">
          <Button className="shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </Link>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search categories..."
              className="pl-10 bg-slate-50 border-slate-200 focus:border-primary"
            />
          </div>
        </CardContent>
      </Card>

      <CategoryTree categories={categories} />
    </div>
  );
}
