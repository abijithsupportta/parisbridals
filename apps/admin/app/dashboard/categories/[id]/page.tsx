/**
 * Category Detail Page
 *
 * Client-side detail page matching the Product detail page UI/UX:
 *   - Back button + title with badges
 *   - Stat cards (children, products, level, status)
 *   - Two-column layout: main info + sidebar
 *   - Children list with actions
 *   - Delete via shared Modal component
 *
 * Route: /dashboard/categories/[id]
 *
 * @module app/dashboard/categories/[id]/page
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  AlertTriangle,
  Folder,
  FolderOpen,
  Layers,
  Tag,
  Plus,
  Globe,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/admin/Modal";
import { useCategory, useCategories, useCategoryChildren, useDeleteCategory } from "@/hooks";
import { type Category } from "@/domain";

type DeleteCheck = {
  canDelete: boolean;
  reason?: string;
  productCount?: number;
  childCount?: number;
};

function readDeleteCheck(payload: any): DeleteCheck {
  const data = payload?.data ?? payload ?? {};
  return {
    canDelete: Boolean(data.canDelete),
    reason: data.reason,
    productCount: data.productCount ?? data.relatedData?.productCount ?? 0,
    childCount: data.childCount ?? data.relatedData?.childCount ?? 0,
  };
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const { category, isLoading } = useCategory(categoryId);
  const { categories: allCategories } = useCategories();
  const { children, isLoading: isLoadingChildren } = useCategoryChildren(categoryId);
  const deleteCategory = useDeleteCategory();

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCheckResult, setDeleteCheckResult] = useState<{
    canDelete: boolean;
    reason?: string;
    productCount?: number;
    childCount?: number;
  } | null>(null);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);

  // Derived data
  const parent: Category | undefined = useMemo(
    () =>
      category?.parent_id
        ? allCategories.find((c) => c.id === category.parent_id)
        : undefined,
    [category, allCategories]
  );

  const grandparent: Category | undefined = useMemo(
    () =>
      parent?.parent_id
        ? allCategories.find((c) => c.id === parent.parent_id)
        : undefined,
    [parent, allCategories]
  );

  // Level detection
  const level = useMemo(() => {
    if (!category) return "main";
    if (!category.parent_id) return "main";
    if (parent && !parent.parent_id) return "sub";
    return "variant";
  }, [category, parent]);

  const levelConfig = {
    main: { label: "Main Category", cls: "bg-purple-100 text-purple-700", Icon: FolderOpen },
    sub: { label: "Sub Category", cls: "bg-blue-100 text-blue-700", Icon: Layers },
    variant: { label: "Variant", cls: "bg-amber-100 text-amber-700", Icon: Tag },
  }[level];

  const canCreateChild = level !== "variant";
  const childLabel = level === "main" ? "Subcategory" : level === "sub" ? "Variant" : null;
  const childPluralLabel = level === "main" ? "Subcategories" : level === "sub" ? "Variants" : "Children";

  // Product count for this category
  const [productCount, setProductCount] = useState<number | null>(null);
  useEffect(() => {
    if (!categoryId) return;
    fetch(`/api/categories/${categoryId}/can-delete`)
      .then((r) => r.json())
      .then((payload) => {
        const data = readDeleteCheck(payload);
        setProductCount(data.productCount ?? 0);
      })
      .catch(() => setProductCount(0));
  }, [categoryId]);

  const handleOpenDeleteModal = async () => {
    setIsCheckingDelete(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}/can-delete`);
      const payload = await res.json();
      setDeleteCheckResult(readDeleteCheck(payload));
    } catch {
      setDeleteCheckResult({
        canDelete: false,
        reason: "Unable to verify. Try again.",
      });
    }
    setIsCheckingDelete(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCheckResult?.canDelete) return;
    try {
      await deleteCategory.mutateAsync(categoryId);
      setIsDeleteModalOpen(false);
      router.push("/dashboard/categories");
    } catch {
      // Error handled in hook
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6 min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  // Not found
  if (!category) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Folder className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            Category Not Found
          </h3>
          <p className="mb-6 text-sm text-slate-500 max-w-sm">
            The category you are looking for does not exist or has been removed.
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
    <div className="space-y-6 pb-12">
      {/* ── Page Header (matches Product detail) ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/categories")}
            className="w-9 h-9 mt-0.5 shrink-0 border-slate-200 text-slate-500 hover:text-slate-900 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {category.name}
              </h1>
              <Badge
                variant="secondary"
                className={`px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${levelConfig.cls}`}
              >
                <levelConfig.Icon className="w-3 h-3 mr-1" />
                {levelConfig.label}
              </Badge>
              <Badge
                variant="secondary"
                className={`px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  category.is_active
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {category.is_active ? "Active" : "Inactive"}
              </Badge>
              {category.is_global && (
                <Badge
                  variant="outline"
                  className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider border-indigo-200 text-indigo-700 bg-indigo-50"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  Global
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
              {/* Breadcrumb path */}
              {grandparent && (
                <>
                  <Link
                    href={`/dashboard/categories/${grandparent.id}`}
                    className="hover:text-slate-900 font-medium text-slate-700"
                  >
                    {grandparent.name}
                  </Link>
                  <span className="text-slate-300">›</span>
                </>
              )}
              {parent && (
                <>
                  <Link
                    href={`/dashboard/categories/${parent.id}`}
                    className="hover:text-slate-900 font-medium text-slate-700"
                  >
                    {parent.name}
                  </Link>
                  <span className="text-slate-300">›</span>
                </>
              )}
              <span className="font-mono text-xs">{category.slug}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() =>
              router.push(`/dashboard/categories/edit/${category.id}`)
            }
            className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Edit className="h-4 w-4" />
            Edit Category
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleOpenDeleteModal}
            disabled={isCheckingDelete}
            className="w-9 h-9 border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 bg-white"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Stat Cards (matches Product detail layout) ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Hierarchy Level"
          value={levelConfig.label}
          subtext={`Depth ${level === "main" ? 1 : level === "sub" ? 2 : 3} of 3`}
        />
        <StatCard
          label={childPluralLabel}
          value={isLoadingChildren ? null : String(children.length)}
          subtext={`Direct ${childPluralLabel.toLowerCase()}`}
          highlight={children.length > 0}
        />
        <StatCard
          label="Linked Products"
          value={productCount === null ? null : String(productCount)}
          subtext="Products in this category"
        />
        <StatCard
          label="Sort Order"
          value={String(category.sort_order)}
          subtext={`Created ${new Date(category.created_at).toLocaleDateString()}`}
        />
      </div>

      {/* ── Main Layout (2-column like Product detail) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Main Info + Children */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Info Card */}
          <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
            <div className="flex flex-col md:flex-row">
              {/* Image Panel */}
              <div className="md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col items-center justify-center min-h-[250px]">
                {category.image_url ? (
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-lg border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      No Image
                    </span>
                  </div>
                )}
              </div>

              {/* Core Details Panel */}
              <div className="flex-1 p-6 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Category Name
                  </h3>
                  <span className="text-3xl font-bold tracking-tight text-slate-900">
                    {category.name}
                  </span>
                </div>

                <div className="h-px w-full bg-slate-100 mb-6" />

                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Description
                  </h3>
                  {category.description ? (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {category.description}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      No description provided for this category.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Children List */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  {childPluralLabel}
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  {level === "variant"
                    ? "Variants are leaf nodes — no children allowed"
                    : `Direct ${childPluralLabel.toLowerCase()} under this category`}
                </CardDescription>
              </div>
              {canCreateChild && (
                <Button
                  size="sm"
                  asChild
                  className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
                >
                  <Link
                    href={`/dashboard/categories/create?parent=${category.id}`}
                  >
                    <Plus className="w-4 h-4" />
                    Add {childLabel}
                  </Link>
                </Button>
              )}
            </CardHeader>
            <div>
              {!canCreateChild ? (
                <div className="p-6 text-center">
                  <div className="p-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    Variants are leaf nodes in the category hierarchy. To
                    organize further, create additional variants under the parent
                    sub category.
                  </div>
                </div>
              ) : isLoadingChildren ? (
                <div className="divide-y divide-slate-100">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <div className="h-10 w-10 bg-slate-100 rounded-lg animate-pulse shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-1/4 bg-slate-50 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : children.length === 0 ? (
                <div className="p-12 text-center">
                  <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-4">
                    No {childPluralLabel.toLowerCase()} yet.
                  </p>
                  <Button variant="outline" asChild>
                    <Link
                      href={`/dashboard/categories/create?parent=${category.id}`}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create first {childLabel?.toLowerCase()}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() =>
                        router.push(`/dashboard/categories/${child.id}`)
                      }
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {child.image_url ? (
                          <img
                            src={child.image_url}
                            alt={child.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Folder className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 group-hover:text-slate-600 transition-colors truncate">
                              {child.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-xs font-medium px-2 py-0.5 ${
                                child.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {child.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                            {child.slug}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-slate-400 hover:text-slate-900"
                          asChild
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <Link
                            href={`/dashboard/categories/edit/${child.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="space-y-6">
          {/* Category Identifiers */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Category Identifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">Slug</dt>
                  <dd className="font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">
                    {category.slug}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">Level</dt>
                  <dd className="font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs capitalize">
                    {level}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">System ID</dt>
                  <dd
                    className="font-mono text-slate-400 text-xs truncate max-w-[120px]"
                    title={category.id}
                  >
                    {category.id.substring(0, 8)}...
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Parent Info */}
          {parent && (
            <Card className="shadow-sm border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-200 py-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Parent Category
                </CardTitle>
                <FolderOpen className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent className="p-5">
                <Link
                  href={`/dashboard/categories/${parent.id}`}
                  className="flex items-center gap-3 group"
                >
                  {parent.image_url ? (
                    <img
                      src={parent.image_url}
                      alt={parent.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <Folder className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-slate-600 transition-colors">
                      {parent.name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {parent.slug}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Status Info */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Status & Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium flex items-center gap-1.5">
                    {category.is_active ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    Status
                  </dt>
                  <dd className={`font-medium ${category.is_active ? "text-emerald-700" : "text-slate-500"}`}>
                    {category.is_active ? "Active" : "Inactive"}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Scope
                  </dt>
                  <dd className="font-medium text-slate-700">
                    {category.is_global ? "Global" : "Store-specific"}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">Sort Order</dt>
                  <dd className="font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">
                    {category.sort_order}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Delete Modal (reuses shared Modal component) ─────────────── */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Category"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                {deleteCheckResult?.canDelete
                  ? "Confirm Deletion"
                  : "Cannot Delete"}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {deleteCheckResult?.canDelete
                  ? <>Are you sure you want to permanently delete <span className="font-semibold text-slate-900">{category.name}</span>? This action cannot be undone.</>
                  : deleteCheckResult?.reason || "This category cannot be deleted."}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="border-slate-200"
            >
              Cancel
            </Button>
            {deleteCheckResult?.canDelete && (
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteCategory.isPending}
              >
                {deleteCategory.isPending ? "Deleting..." : "Delete Category"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Stat Card (same pattern as Product detail) ──────────────────────── */
function StatCard({
  label,
  value,
  subtext,
  highlight,
  alert,
}: {
  label: string;
  value: string | null;
  subtext?: string;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          {highlight && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          {alert && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          )}
        </div>
        <div className="space-y-1">
          {value === null ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
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
