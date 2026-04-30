/**
 * CategoryForm Component
 *
 * Reusable form for creating or editing product categories.
 * Supports the three-level hierarchy:
 *   - Main Category (no parent)
 *   - Sub Category (parent = main)
 *   - Variant (parent = sub)
 *
 * Features:
 *   - Image upload via /api/upload (stored in R2)
 *   - Parent category dropdown for hierarchy selection
 *   - Auto-detected level badge (Main / Sub / Variant)
 *   - Slug, sort order, description, and status controls
 *
 * @component
 * @param {Object} props
 * @param {Category} [props.category] - Existing category for edit mode; omit for create mode
 * @param {Category[]} [props.allCategories=[]] - All existing categories for parent selection
 *
 * @example
 * // Create mode
 * <CategoryForm allCategories={categories} />
 *
 * // Edit mode
 * <CategoryForm category={category} allCategories={categories} />
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Category } from "@/domain/types/category";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useAppStore } from "@/stores";

interface CategoryFormProps {
  /** Existing category for edit mode; when omitted, form operates in create mode */
  category?: Category;
  /** All categories from the database, used to populate the parent dropdown */
  allCategories?: Category[];
  /** Pre-selected parent id (used when arriving from a category detail page's Add button) */
  defaultParentId?: string | null;
}

export default function CategoryForm({
  category,
  allCategories = [],
  defaultParentId = null,
}: CategoryFormProps) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  // Determine mode: edit when a category prop is passed, create otherwise
  const isEdit = !!category;

  // Tracks the form submission state
  const [loading, setLoading] = useState(false);

  // Stores the last submission error to display in a banner
  const [error, setError] = useState("");

  // Tracks whether the user has manually edited the slug field.
  // When false, slug is auto-generated from the name in real-time.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Form state initialized from the category prop in edit mode, or defaults in create mode
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

  /**
   * Converts a display name into a URL-friendly slug.
   * Lowercases, trims, replaces spaces with hyphens, and strips non-alphanumeric chars.
   *
   * @param name - Raw category name input
   * @returns Sanitized slug string (e.g., "Gold Earrings" → "gold-earrings")
   */
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")           // spaces → hyphens
      .replace(/[^a-z0-9-]/g, "")     // remove non-alphanumeric except hyphens
      .replace(/--+/g, "-");          // collapse multiple hyphens
  };

  // Auto-sync slug from name whenever name changes, unless user manually overrode it
  useEffect(() => {
    if (!slugManuallyEdited) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [formData.name, slugManuallyEdited]);

  // Filter available parent options to prevent circular references
  // Exclude the current category so it cannot be its own parent
  const mains = allCategories.filter((c) => !c.parent_id && c.id !== category?.id);
  const subs = allCategories.filter((c) => {
    const parent = allCategories.find((p) => p.id === c.parent_id);
    return parent && !parent.parent_id && c.id !== category?.id;
  });
  const fixedParent = defaultParentId
    ? allCategories.find((c) => c.id === defaultParentId)
    : null;
  const isParentLocked = !isEdit;

  /**
   * Determines the hierarchy level based on the currently selected parent.
   * Used to display the level badge and guide the user.
   *
   * @returns "main" | "sub" | "variant"
   */
  const getLevel = () => {
    if (!formData.parent_id) return "main";
    const parent = allCategories.find((c) => c.id === formData.parent_id);
    if (!parent?.parent_id) return "sub";
    return "variant";
  };



  /**
   * UX helper: clears the default "0" value in sort order input
   * when the user focuses the field, making it easier to type a new value.
   */
  const clearZeroOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  // Prevent mouse wheel from accidentally changing number input values
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "number") {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  /**
   * Submits the form to either create a new category or update an existing one.
   * On success, redirects back to the categories list page.
   *
   * @param e - React form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Branch between create (POST) and update (PATCH) based on the isEdit flag
      const endpoint =
        isEdit && category
          ? `/api/categories/${category.id}`
          : `/api/categories`;
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

      // Redirect back to the parent's detail page if this was a child creation
      // (improves UX: user immediately sees the freshly-created child in context).
      // Otherwise fall back to the top-level categories list.
      const redirectTo =
        !isEdit && formData.parent_id
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

  const level = getLevel();
  const levelLabel = level === "main" ? "Main Category" : level === "sub" ? "Sub Category" : "Variant";
  const levelColor = level === "main" ? "bg-purple-100 text-purple-700" : level === "sub" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";

  return (
    <Card className="border-0 shadow-2xl w-full max-w-6xl">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-purple-600 to-primary text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-white">
              {isEdit ? "Edit Category" : "Create New Category"}
            </CardTitle>
            <p className="text-slate-100 text-sm mt-1">
              {isEdit ? "Update category details" : "Organize your products into categories"}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColor}`}>
            {levelLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submission error banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Image Upload */}
          <FileUpload
            label="Category Image"
            accept="image/*"
            multiple={false}
            maxSize={5 * 1024 * 1024}
            folder="categories"
            value={formData.image_url ? [formData.image_url] : []}
            onChange={(urls) =>
              setFormData((prev) => ({ ...prev, image_url: urls[0] || "" }))
            }
            helperText="Upload a category image (max 5MB)"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Category Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Earrings"
                className="h-12 border-slate-300 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Slug *</label>
              <Input
                value={formData.slug}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({ ...prev, slug: value }));
                  // Mark as manually edited if user types anything;
                  // clearing the field resumes auto-generation from name
                  setSlugManuallyEdited(value.length > 0);
                }}
                required
                placeholder="auto-generated-from-name"
                className="h-12 border-slate-300 focus:border-primary"
              />
              <p className="text-xs text-slate-500">
                Auto-generated from name. Type to customize, clear to reset.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this category"
              className="h-12 border-slate-300 focus:border-primary"
            />
          </div>

          {/* Parent Category Selection */}
          {isParentLocked ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Hierarchy Placement</p>
              <p className="text-sm text-slate-600 mt-1">
                {fixedParent
                  ? `This will be created under "${fixedParent.name}".`
                  : "This will be created as a Main Category."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Parent Category</label>
              <select
                value={formData.parent_id || ""}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
              >
                <option value="">None (Main Category)</option>
                <optgroup label="Main Categories">
                  {mains.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
                {subs.length > 0 && (
                  <optgroup label="Sub Categories">
                    {subs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {allCategories.find((p) => p.id === s.parent_id)?.name} &gt; {s.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-xs text-slate-500">
                Select a parent to create a Sub Category or Variant. Leave empty for Main Category.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Sort Order</label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                onFocus={clearZeroOnFocus}
                placeholder="0"
                className="h-12 border-slate-300 focus:border-primary"
              />
              <p className="text-xs text-slate-500">Lower numbers appear first</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_global"
                checked={formData.is_global}
                onChange={(e) => setFormData({ ...formData, is_global: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is_global" className="text-sm font-medium text-slate-700">
                Global Category (available to all stores)
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Category is active and visible
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <Button type="submit" disabled={loading} variant="gradient" className="flex-1 h-12 text-base">
              {loading ? "Saving..." : isEdit ? "Update Category" : "Create Category"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/categories")}
              className="flex-1 h-12 text-base border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
