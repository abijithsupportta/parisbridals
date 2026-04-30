/**
 * CategoryForm Component
 *
 * Reusable create/edit form for the admin category hierarchy.
 *
 * @component
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  FolderTree,
  Globe2,
  Hash,
  ImageIcon,
  ListOrdered,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { type Category } from "@/domain/types/category";
import { useAppStore } from "@/stores";
import {
  CategoryFieldLabel,
  CategoryFormPanel,
  CategoryPlacementSummary,
  CategoryToggleRow,
  categoryLevelConfig,
  type CategoryLevelName,
} from "@/components/admin/category/CategoryFormPrimitives";

interface CategoryFormProps {
  /** Existing category for edit mode; when omitted, form operates in create mode */
  category?: Category;
  /** All categories from the database, used to populate the parent dropdown */
  allCategories?: Category[];
  /** Pre-selected parent id from the current details page */
  defaultParentId?: string | null;
}

export default function CategoryForm({
  category,
  allCategories = [],
  defaultParentId = null,
}: CategoryFormProps) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const isEdit = Boolean(category);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formData, setFormData] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    image_url: category?.image_url || "",
    sort_order: category?.sort_order || 0,
    is_active: category?.is_active ?? true,
    is_global: category?.is_global ?? true,
    parent_id: (category?.parent_id ?? defaultParentId ?? null) as string | null,
    store_id: user?.store_id || null,
  });

  const generateSlug = (name: string): string =>
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-");

  useEffect(() => {
    if (!slugManuallyEdited) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [formData.name, slugManuallyEdited]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "number") {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  const mains = allCategories.filter((c) => !c.parent_id && c.id !== category?.id);
  const subs = allCategories.filter((c) => {
    const parent = allCategories.find((p) => p.id === c.parent_id);
    return parent && !parent.parent_id && c.id !== category?.id;
  });
  const selectedParent = formData.parent_id
    ? allCategories.find((c) => c.id === formData.parent_id)
    : null;
  const isParentLocked = !isEdit;

  const getLevel = (): CategoryLevelName => {
    if (!formData.parent_id) return "main";
    const parent = allCategories.find((c) => c.id === formData.parent_id);
    if (!parent?.parent_id) return "sub";
    return "variant";
  };

  const level = getLevel();
  const levelConfig = categoryLevelConfig[level];
  const LevelIcon = levelConfig.Icon;
  const title = isEdit ? "Edit Category" : `Add ${levelConfig.label}`;
  const subtitle = isEdit
    ? "Update details, placement, visibility, and category media"
    : selectedParent
    ? `Creating inside ${selectedParent.name}`
    : "Create a top-level category for the catalogue";

  const clearZeroOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  const handleCancel = () => {
    if (isEdit && category) {
      router.push(`/dashboard/categories/${category.id}`);
      return;
    }
    router.push(formData.parent_id ? `/dashboard/categories/${formData.parent_id}` : "/dashboard/categories");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isEdit && category ? `/api/categories/${category.id}` : "/api/categories";
      const method = isEdit && category ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(payload.error?.message || payload.error || `Request failed (${res.status})`);
      }

      const redirectTo =
        isEdit && category
          ? `/dashboard/categories/${category.id}`
          : formData.parent_id
          ? `/dashboard/categories/${formData.parent_id}`
          : "/dashboard/categories";

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("Error saving category:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCancel}
            className="w-9 h-9 border-slate-200 text-slate-500 hover:text-slate-900 bg-white shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${levelConfig.badgeClass}`}>
                <LevelIcon className="h-3.5 w-3.5" />
                {levelConfig.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CategoryFormPanel
            title="Category Details"
            description="Name, slug, and customer-facing description"
          >
            <div className="space-y-1.5">
              <CategoryFieldLabel required>Category Name</CategoryFieldLabel>
              <Input
                value={formData.name}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name: nextName,
                    slug: slugManuallyEdited ? prev.slug : generateSlug(nextName),
                  }));
                }}
                required
                autoFocus
                placeholder="e.g., Bridal Necklaces"
                className="h-11 border-slate-200 focus:border-slate-900 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <CategoryFieldLabel>Description</CategoryFieldLabel>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Short note about the collection, occasion, or style"
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
              />
            </div>
          </CategoryFormPanel>

          <CategoryFormPanel
            title="Category Image"
            description="Use a clean image that makes the category easy to recognise"
            action={<ImageIcon className="h-4 w-4 text-slate-400" />}
          >
            <FileUpload
              accept="image/*"
              multiple={false}
              maxSize={5 * 1024 * 1024}
              folder="categories"
              value={formData.image_url ? [formData.image_url] : []}
              onChange={(urls) =>
                setFormData((prev) => ({ ...prev, image_url: urls[0] || "" }))
              }
              helperText="Upload one square-friendly image, max 5MB."
            />
          </CategoryFormPanel>
        </div>

        <div className="space-y-6">
          <CategoryFormPanel
            title="Hierarchy"
            description="Placement controls where this category appears"
            action={<FolderTree className="h-4 w-4 text-slate-400" />}
          >
            <CategoryPlacementSummary
              level={level}
              parentName={selectedParent?.name}
              locked={isParentLocked}
            />

            {!isParentLocked && (
              <div className="space-y-1.5">
                <CategoryFieldLabel>Parent Category</CategoryFieldLabel>
                <select
                  value={formData.parent_id || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, parent_id: e.target.value || null })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                >
                  <option value="">None (Main Category)</option>
                  <optgroup label="Main Categories">
                    {mains.map((main) => (
                      <option key={main.id} value={main.id}>
                        {main.name}
                      </option>
                    ))}
                  </optgroup>
                  {subs.length > 0 && (
                    <optgroup label="Sub Categories">
                      {subs.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {allCategories.find((p) => p.id === sub.parent_id)?.name} &gt; {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
          </CategoryFormPanel>

          <CategoryFormPanel
            title="Visibility"
            description="Control admin and storefront availability"
            action={<Eye className="h-4 w-4 text-slate-400" />}
          >
            <CategoryToggleRow
              title="Active"
              description="Visible in the admin and storefront"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
              icon={<Eye className="h-4 w-4 text-slate-500" />}
            />
            <CategoryToggleRow
              title="Global Category"
              description="Available across all stores"
              checked={formData.is_global}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_global: checked })
              }
              icon={<Globe2 className="h-4 w-4 text-slate-500" />}
            />
          </CategoryFormPanel>

          <CategoryFormPanel
            title="Identifiers"
            description="Slug and ordering metadata"
            action={<Hash className="h-4 w-4 text-slate-400" />}
          >
            <div className="space-y-1.5">
              <CategoryFieldLabel required>URL Slug</CategoryFieldLabel>
              <Input
                value={formData.slug}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({ ...prev, slug: value }));
                  setSlugManuallyEdited(value.length > 0);
                }}
                required
                placeholder="auto-generated"
                className="h-9 border-slate-200 focus:border-slate-900 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <CategoryFieldLabel>Sort Order</CategoryFieldLabel>
              <div className="relative">
                <ListOrdered className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  onFocus={clearZeroOnFocus}
                  placeholder="0"
                  className="h-9 pl-9 border-slate-200 focus:border-slate-900"
                />
              </div>
            </div>
          </CategoryFormPanel>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-8 px-8 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200">
        <div className="flex items-center justify-between max-w-6xl mx-auto gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="h-10 border-slate-200 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="h-10 px-6 bg-slate-900 text-white hover:bg-slate-800 font-semibold"
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : `Create ${levelConfig.label}`}
          </Button>
        </div>
      </div>
    </form>
  );
}
