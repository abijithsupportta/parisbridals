/**
 * Category Detail Page
 *
 * Displays a single category with its metadata and direct children:
 *   - Main category  → shows Sub categories and an "Add Subcategory" button
 *   - Sub category   → shows Variants and an "Add Variant" button
 *   - Variant        → shows an info notice (variants are leaf nodes)
 *
 * The detail page is reached from each card on /dashboard/categories via the
 * view (eye) button in CategoryTreeActions.
 *
 * Route: /dashboard/categories/[id]
 *
 * @module app/dashboard/categories/[id]/page
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Folder,
  FolderOpen,
  Layers,
  Tag,
  Globe,
  CheckCircle2,
  XCircle,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { categoryService } from "@/services";
import { type Category } from "@/domain";
import CategoryTreeActions from "@/components/admin/CategoryTreeActions";

/** Thumbnail/fallback image renderer. */
function CategoryImage({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
      <Folder className="w-5 h-5 text-slate-400" />
    </div>
  );
}

/** Color-coded level badge (Main / Sub / Variant). */
function LevelBadge({ level }: { level: "main" | "sub" | "variant" }) {
  const map = {
    main: { text: "Main Category", cls: "bg-purple-100 text-purple-700", Icon: FolderOpen },
    sub: { text: "Sub Category", cls: "bg-blue-100 text-blue-700", Icon: Layers },
    variant: { text: "Variant", cls: "bg-amber-100 text-amber-700", Icon: Tag },
  }[level];
  const { Icon } = map;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${map.cls}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {map.text}
    </span>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { id } = await params;

  const categoryResult = await categoryService.getCategoryById(id);
  if (!categoryResult.success || !categoryResult.data) {
    notFound();
  }

  const category = categoryResult.data;
  const allCategoriesResult = await categoryService.getAllCategories();
  const allCategories = allCategoriesResult.success ? allCategoriesResult.data || [] : [];
  
  const childrenResult = await categoryService.getCategoryChildren(id);
  const children = childrenResult.success ? childrenResult.data || [] : [];
  
  const parent: Category | null = category.parent_id
    ? allCategories.find((c) => c.id === category.parent_id) ?? null
    : null;
  const grandparent: Category | null =
    parent?.parent_id
      ? allCategories.find((c) => c.id === parent.parent_id) ?? null
      : null;

  const level = category.level;

  // Determine child creation affordance based on current level
  const canCreateChild = level !== "variant";
  const childLabel =
    level === "main" ? "Subcategory" : level === "sub" ? "Variant" : null;
  const childPluralLabel =
    level === "main" ? "Subcategories" : level === "sub" ? "Variants" : "Children";
  const ChildIcon = level === "main" ? Layers : Tag;

  return (
    <div className="space-y-6">
      {/* Top bar: back link + breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link
            href="/dashboard/categories"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Categories
          </Link>
          <nav className="text-sm text-slate-500">
            {grandparent && (
              <>
                <Link
                  href={`/dashboard/categories/${grandparent.id}`}
                  className="hover:text-slate-900"
                >
                  {grandparent.name}
                </Link>
                <span className="mx-2">/</span>
              </>
            )}
            {parent && (
              <>
                <Link
                  href={`/dashboard/categories/${parent.id}`}
                  className="hover:text-slate-900"
                >
                  {parent.name}
                </Link>
                <span className="mx-2">/</span>
              </>
            )}
            <span className="text-slate-900 font-medium">{category.name}</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <CategoryTreeActions category={category} />
        </div>
      </div>

      {/* Hero card: category details */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 border-b border-slate-200">
          <div className="flex items-start gap-6">
            {category.image_url ? (
              <img
                src={category.image_url}
                alt={category.name}
                className="w-28 h-28 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center">
                <Folder className="w-10 h-10 text-slate-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <LevelBadge level={level} />
                <Badge
                  className={
                    category.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-700"
                  }
                >
                  {category.is_active ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" /> Inactive
                    </>
                  )}
                </Badge>
                {category.is_global && (
                  <Badge className="bg-indigo-100 text-indigo-700">
                    <Globe className="w-3 h-3 mr-1" /> Global
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-slate-900">{category.name}</h1>
              <p className="text-slate-500 mt-1">
                {category.description || "No description provided."}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <div className="inline-flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-xs">{category.slug}</span>
                </div>
                <div>
                  <span className="text-slate-400">Sort:</span> {category.sort_order}
                </div>
                <div>
                  <span className="text-slate-400">Created:</span>{" "}
                  {new Date(category.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Children section */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ChildIcon className="w-5 h-5 text-slate-600" />
              <h2 className="text-xl font-semibold text-slate-900">
                {childPluralLabel}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({children.length})
                </span>
              </h2>
            </div>
            {canCreateChild && (
              <Link
                href={`/dashboard/categories/create?parent=${category.id}`}
              >
                <Button className="shadow-lg shadow-primary/25">
                  <Plus className="w-4 h-4 mr-2" />
                  Add {childLabel}
                </Button>
              </Link>
            )}
          </div>

          {!canCreateChild ? (
            <div className="p-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Variants are leaf nodes in the category hierarchy. You cannot add
              children under a variant. To organize further, create additional
              variants under the parent sub category.
            </div>
          ) : children.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <ChildIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">
                No {childPluralLabel.toLowerCase()} yet.
              </p>
              <Link href={`/dashboard/categories/create?parent=${category.id}`}>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create first {childLabel?.toLowerCase()}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <Link
                    href={`/dashboard/categories/${child.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <CategoryImage url={child.image_url} name={child.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">
                          {child.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs flex-shrink-0"
                        >
                          {child.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        {child.slug}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <CategoryTreeActions category={child} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
