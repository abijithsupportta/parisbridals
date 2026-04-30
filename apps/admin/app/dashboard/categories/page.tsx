/**
 * Categories Management Page
 *
 * Client-side category listing matching the Product module's UI/UX:
 *   - Stat cards row (total, active, inactive, main categories)
 *   - Search bar with debounce
 *   - Shimmer/skeleton loading states
 *   - Hierarchical tree view inside a professional Card container
 *   - Delete confirmation via the shared Modal component
 *
 * Route: /dashboard/categories
 *
 * @module app/dashboard/categories/page
 */

"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  FolderTree,
  Plus,
  Loader2,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCategories } from "@/hooks";
import { useAppStore } from "@/stores";
import CategoryTree from "@/components/admin/CategoryTree";

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading categories...
        </div>
      }
    >
      <CategoriesContent />
    </Suspense>
  );
}

function CategoriesContent() {
  const router = useRouter();
  const { categories, isLoading } = useCategories();

  // Local search state with filtering
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Stats computed from the full category list
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.is_active).length;
    const inactive = total - active;
    const mains = categories.filter((c) => !c.parent_id).length;
    const subs = categories.filter((c) => {
      if (!c.parent_id) return false;
      const parent = categories.find((p) => p.id === c.parent_id);
      return parent ? !parent.parent_id : false;
    }).length;
    const variants = total - mains - subs;

    return { total, active, inactive, mains, subs, variants };
  }, [categories]);

  // Filter categories while preserving parents so the tree stays navigable.
  const filteredCategories = useMemo(() => {
    if (!debouncedQuery) return categories;
    const q = debouncedQuery.toLowerCase();
    const matching = categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
    const visibleIds = new Set<string>();

    matching.forEach((category) => {
      let current: typeof category | undefined = category;
      while (current) {
        visibleIds.add(current.id);
        current = current.parent_id
          ? categories.find((c) => c.id === current?.parent_id)
          : undefined;
      }
    });

    return categories.filter((category) => visibleIds.has(category.id));
  }, [categories, debouncedQuery]);

  const showShimmer = isLoading;

  return (
    <div className="space-y-6 pb-12">
      {/* Header — matches Product module */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Categories
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <Store className="w-4 h-4 text-slate-400" />
            <span>Manage Main, Sub, and Variant categories</span>
            <span>• {stats.total} total categories</span>
          </p>
        </div>
        <Button
          asChild
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
        >
          <Link href="/dashboard/categories/create">
            <Plus className="w-4 h-4" />
            Add Main Category
          </Link>
        </Button>
      </div>

      {/* Stat Cards — same layout as Product module */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Categories"
          value={showShimmer ? null : String(stats.total)}
          subtext="Across all hierarchy levels"
        />
        <StatCard
          label="Main Categories"
          value={showShimmer ? null : String(stats.mains)}
          subtext={`${stats.subs} sub · ${stats.variants} variants`}
        />
        <StatCard
          label="Active"
          value={showShimmer ? null : String(stats.active)}
          subtext="Visible in the storefront"
        />
        <StatCard
          label="Inactive"
          value={showShimmer ? null : String(stats.inactive)}
          subtext="Hidden from customers"
          alert={stats.inactive > 0}
        />
      </div>

      {/* Search Bar — same card style as Product module */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search main, sub, or variant categories..."
              className="pl-9 border-slate-200 focus:border-slate-900"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Tree — inside a Card like Products table */}
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        {showShimmer ? (
          <div className="divide-y divide-slate-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-5 w-5 bg-slate-100 rounded animate-pulse shrink-0" />
                <div className="h-10 w-10 bg-slate-100 rounded-lg animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-slate-50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-16 text-center">
            <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              No Categories Found
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchInput
                ? `No categories matched your search for "${searchInput}".`
                : "There are no categories yet. Create your first main category to get started."}
            </p>
            {!searchInput && (
              <Button
                className="mt-6 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => router.push("/dashboard/categories/create")}
              >
                Create First Main Category
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4">
            <CategoryTree categories={filteredCategories} />
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Minimalist Professional Stat Card (reuses Product module pattern) ── */
function StatCard({
  label,
  value,
  subtext,
  alert,
}: {
  label: string;
  value: string | null;
  subtext?: string;
  alert?: boolean;
}) {
  return (
    <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          {alert && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          )}
        </div>
        <div className="space-y-1">
          {value === null ? (
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
          ) : (
            <p
              className={`text-2xl font-bold tracking-tight ${
                alert ? "text-red-600" : "text-slate-900"
              }`}
            >
              {value}
            </p>
          )}
          {subtext && (
            <p className="text-xs font-medium text-slate-500">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
