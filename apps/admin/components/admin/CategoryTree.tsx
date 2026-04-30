/**
 * CategoryTree Component
 *
 * Interactive collapsible tree view of the 3-level category hierarchy:
 *   Main → Sub → Variant.
 *
 * Features:
 *   - Each Main category card has a chevron to expand/collapse its Subs.
 *   - Each Sub category row has a chevron to expand/collapse its Variants.
 *   - Variants are leaf nodes (no toggle).
 *   - All sections start expanded by default.
 *   - Uses CSS transitions for smooth open/close feel.
 *
 * @component
 * @param {Object} props
 * @param {Category[]} props.categories - Flat list of all categories from Supabase
 *
 * @example
 * <CategoryTree categories={allCategories} />
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Layers,
  Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Category } from "@/domain/types/category";
import CategoryTreeActions from "@/components/admin/CategoryTreeActions";

/** Thumbnail or fallback icon for a category row. */
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

/** Split flat list into mains, subs, variants. */
function buildHierarchy(categories: Category[]) {
  const mains = categories.filter((c) => !c.parent_id);
  const subs = categories.filter(
    (c) =>
      c.parent_id &&
      categories.find((p) => p.id === c.parent_id && !p.parent_id)
  );
  const variants = categories.filter((c) => {
    const parent = categories.find((p) => p.id === c.parent_id);
    return parent?.parent_id != null;
  });
  return { mains, subs, variants };
}

interface CategoryTreeProps {
  categories: Category[];
}

export default function CategoryTree({ categories }: CategoryTreeProps) {
  const router = useRouter();
  const { mains, subs, variants } = buildHierarchy(categories);

  // Set of category ids that are currently EXPANDED.
  // Initialise with every main and sub id so tree starts fully open.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    mains.forEach((m) => ids.add(m.id));
    subs.forEach((s) => ids.add(s.id));
    return ids;
  });

  /** Toggle expand/collapse for a single category id. */
  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (categories.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">
            No categories found. Click "Add Category" to create your first category.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {mains.map((main) => {
        const mainSubs = subs.filter((s) => s.parent_id === main.id);
        const isMainOpen = expanded.has(main.id);

        return (
          <Card key={main.id} className="border-0 shadow-lg overflow-hidden">
            {/* Main header — clickable chevron toggles all subs */}
            <div
              className="bg-slate-50 border-b border-slate-100 p-4 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => router.push(`/dashboard/categories/${main.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(main.id);
                    }}
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors flex-shrink-0"
                    title={isMainOpen ? "Collapse" : "Expand"}
                  >
                    {isMainOpen ? (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                  <CategoryImage url={main.image_url} name={main.name} />
                  <div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-slate-900">{main.name}</span>
                      <Badge
                        className={
                          main.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {main.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {main.description || main.slug}
                    </p>
                  </div>
                </div>
                <CategoryTreeActions category={main} />
              </div>
            </div>

            {/* Sub Categories — hidden when main is collapsed */}
            {isMainOpen && mainSubs.length > 0 && (
              <div className="divide-y divide-slate-50">
                {mainSubs.map((sub) => {
                  const subVariants = variants.filter(
                    (v) => v.parent_id === sub.id
                  );
                  const isSubOpen = expanded.has(sub.id);

                  return (
                    <div key={sub.id}>
                      <div
                        className="p-4 pl-12 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/categories/${sub.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Sub toggle chevron */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(sub.id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded-md transition-colors flex-shrink-0"
                            title={isSubOpen ? "Collapse variants" : "Expand variants"}
                          >
                            {isSubOpen ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <CategoryImage url={sub.image_url} name={sub.name} />
                          <div>
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-blue-500" />
                              <span className="font-medium text-slate-800">{sub.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {sub.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500">
                              {sub.description || sub.slug}
                            </p>
                          </div>
                        </div>
                        <CategoryTreeActions category={sub} />
                      </div>

                      {/* Variants — hidden when sub is collapsed */}
                      {isSubOpen && subVariants.length > 0 && (
                        <div className="divide-y divide-slate-50">
                          {subVariants.map((variant) => (
                            <div
                              key={variant.id}
                              className="p-4 pl-20 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                              onClick={() => router.push(`/dashboard/categories/${variant.id}`)}
                            >
                              <div className="flex items-center gap-3">
                                {/* Indent spacer where chevron would be */}
                                <div className="w-6 flex-shrink-0" />
                                <CategoryImage
                                  url={variant.image_url}
                                  name={variant.name}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-amber-500" />
                                    <span className="font-medium text-slate-700">
                                      {variant.name}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {variant.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-500">
                                    {variant.description || variant.slug}
                                  </p>
                                </div>
                              </div>
                              <CategoryTreeActions category={variant} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Collapsed placeholder showing count */}
            {!isMainOpen && mainSubs.length > 0 && (
              <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
                {mainSubs.length} sub {mainSubs.length === 1 ? "category" : "categories"} hidden
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
