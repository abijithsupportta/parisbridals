/**
 * ProductForm Component
 *
 * Standalone page form for creating or editing jewellery rental products.
 * Fields match the modal dialog form exactly. Features:
 *   - R2 image upload via FileUpload component
 *   - Cascading category selectors (Main → Sub → Variant)
 *   - Branch selector
 *   - Barcode generation
 *   - Slug auto-generation from name
 *   - Create / Edit mode (determined by `product` prop)
 *
 * @component
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Category } from "@/domain/types/category";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Download } from "lucide-react";
import { useAppStore } from "@/stores";
import { useCreateProduct, useUpdateProduct } from "@/hooks";

const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000001";

interface Branch {
  id: string;
  name: string;
  address?: string;
  is_active?: boolean;
}

interface ProductFormProps {
  /** Existing product for edit mode; omit for create mode */
  product?: any;
  /** All categories for the category dropdown */
  categories?: Category[];
  /** All branches for the branch dropdown */
  branches?: Branch[];
}

export default function ProductForm({
  product,
  categories = [],
  branches = [],
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const { showError, showSuccess } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [userRole, setUserRole] = useState<string>("staff");
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // Fetch current user role
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.role) {
          setUserRole(data.role);
        }
      })
      .catch(() => {
        setUserRole("staff");
      });
  }, []);

  // Extract existing image URLs from product
  const existingImages = (product?.images || []).map((img: any) =>
    typeof img === "string" ? img : img.url
  );

  const [formData, setFormData] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    sku: product?.sku || "",
    barcode: product?.barcode || "",
    description: product?.description || "",
    category_id: product?.category_id || "",
    subcategory_id: product?.subcategory_id || "",
    subvariant_id: product?.subvariant_id || "",
    branch_id: product?.branch_id || "",
    price_per_day: product?.price_per_day || 0,
    security_deposit: product?.security_deposit || 0,
    quantity: product?.quantity || 0,
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    track_inventory: product?.track_inventory ?? true,
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
  });

  // Set default branch_id to "all" for admin/super admin in create mode
  useEffect(() => {
    if (!isEdit && (userRole === 'admin' || userRole === 'super_admin')) {
      setFormData((prev) => ({ ...prev, branch_id: 'all' }));
    }
  }, [isEdit, userRole]);

  const [imageUrls, setImageUrls] = useState<string[]>(existingImages);

  // ── Slug auto-generation ──────────────────────────────────────────
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-");
  };

  useEffect(() => {
    if (!slugManuallyEdited) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [formData.name, slugManuallyEdited]);

  // ── Barcode generation ────────────────────────────────────────────
  const generateBarcode = () => {
    const barcode = `PB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setFormData((prev) => ({ ...prev, barcode }));
  };

  // ── UX: Clear zero on focus, prevent scroll on number inputs ──────
  const clearZeroOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") e.target.value = "";
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "number") {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // ── Category hierarchy ────────────────────────────────────────────
  const mains = categories.filter((c) => !c.parent_id);
  const subs = categories.filter((c) => c.parent_id === formData.category_id);
  const variants = categories.filter((c) => c.parent_id === formData.subcategory_id);

  // Reset child dropdowns when parent changes
  const handleMainCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category_id: value,
      subcategory_id: "",
      subvariant_id: "",
    }));
  };

  const handleSubCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      subcategory_id: value,
      subvariant_id: "",
    }));
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const images = imageUrls.map((url, index) => ({
        url,
        alt_text: formData.name,
        is_primary: index === 0,
        sort_order: index,
      }));

      const payload: any = {
        ...formData,
        images,
        store_id: DEFAULT_STORE_ID,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        subvariant_id: formData.subvariant_id || null,
        branch_id: formData.branch_id || null,
        available_quantity: formData.quantity,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        description: formData.description || undefined,
      };

      let result: any;
      if (isEdit && product) {
        result = await updateProduct.mutateAsync({ id: product.id, data: payload });
      } else {
        result = await createProduct.mutateAsync(payload);
      }

      if (!result.success) {
        // Map error codes to user-friendly messages
        let errorMessage = result.error?.message || 'Request failed';
        
        if (result.error?.code === 'SLUG_EXISTS') {
          errorMessage = 'A product with this slug already exists. Please change the product name or slug.';
        } else if (result.error?.code === 'VALIDATION_ERROR') {
          errorMessage = 'Please check all required fields and try again.';
        } else if (result.error?.code === 'INVALID_CATEGORY') {
          errorMessage = 'Invalid category selected.';
        }
        
        showError(errorMessage);
        return;
      }

      router.push("/dashboard/products");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("Error saving product:", err);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <Card className="border-0 shadow-2xl w-full max-w-6xl">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-purple-600 to-primary text-white">
        <CardTitle className="text-2xl text-white">
          {isEdit ? "Edit Product" : "Create New Product"}
        </CardTitle>
        <p className="text-slate-100 text-sm mt-1">
          {isEdit
            ? "Update product details"
            : "Add a new jewellery item to your inventory"}
        </p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── Section 1: Product Images ─────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Product Images
            </h3>
            <FileUpload
              accept="image/*"
              multiple={true}
              maxFiles={10}
              maxSize={5 * 1024 * 1024}
              folder="products"
              value={imageUrls}
              onChange={setImageUrls}
              helperText="Upload up to 10 product images (max 5MB each). First image will be the primary."
            />
          </div>

          {/* ── Section 2: Basic Information ──────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Product Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="e.g., Diamond Necklace Set"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Slug *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({ ...prev, slug: value }));
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
              <label className="text-sm font-semibold text-slate-700 block">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Materials, occasion, style details..."
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
              />
            </div>
          </div>

          {/* ── Section 3: Identifiers ────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Identifiers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  SKU
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="PB-NK-001"
                  className="h-12 border-slate-300 focus:border-primary font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Barcode
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="Auto-generated"
                    className="flex-1 h-12 border-slate-300 focus:border-primary font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateBarcode}
                    className="h-12 px-3 border-slate-300"
                    title="Generate barcode"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Categories ─────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Category */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Main Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleMainCategoryChange(e.target.value)}
                  className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                >
                  <option value="">Select category</option>
                  {mains.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Subcategory
                </label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  disabled={!formData.category_id || subs.length === 0}
                  className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.category_id
                      ? "← Pick category"
                      : subs.length === 0
                      ? "None available"
                      : "Select subcategory"}
                  </option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variant */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Variant
                </label>
                <select
                  value={formData.subvariant_id}
                  onChange={(e) =>
                    setFormData({ ...formData, subvariant_id: e.target.value })
                  }
                  disabled={!formData.subcategory_id || variants.length === 0}
                  className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.subcategory_id
                      ? "← Pick subcategory"
                      : variants.length === 0
                      ? "None available"
                      : "Select variant"}
                  </option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Section 5: Branch ─────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Branch
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Available at Branch
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) =>
                    setFormData({ ...formData, branch_id: e.target.value })
                  }
                  className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                >
                  {(userRole === 'admin' || userRole === 'super_admin') && !isEdit && (
                    <option value="all">All Branches</option>
                  )}
                  <option value="">Select branch</option>
                  {branches
                    .filter((b) => b.is_active !== false)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
                {(userRole === 'admin' || userRole === 'super_admin') && formData.branch_id === 'all' && (
                  <p className="text-xs text-slate-500">
                    Product will be available at all branches
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 6: Pricing & Inventory ────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Pricing & Inventory
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Rent Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={formData.price_per_day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_per_day: parseFloat(e.target.value) || 0,
                      })
                    }
                    onFocus={clearZeroOnFocus}
                    required
                    placeholder="0"
                    className="h-12 pl-7 border-slate-300 focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Security Deposit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={formData.security_deposit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        security_deposit: parseFloat(e.target.value) || 0,
                      })
                    }
                    onFocus={clearZeroOnFocus}
                    placeholder="0"
                    className="h-12 pl-7 border-slate-300 focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Total Quantity *
                </label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  onFocus={clearZeroOnFocus}
                  required
                  placeholder="0"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Low Stock Alert
                </label>
                <Input
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      low_stock_threshold: parseInt(e.target.value) || 0,
                    })
                  }
                  onFocus={clearZeroOnFocus}
                  placeholder="5"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* ── Section 7: Status & Options ───────────────────────── */}
          <div className="space-y-4 pt-2">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                <span className="text-sm font-medium text-slate-700">
                  Active
                </span>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </label>
              <label className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                <span className="text-sm font-medium text-slate-700">
                  Featured
                </span>
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) =>
                    setFormData({ ...formData, is_featured: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </label>
              <label className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                <span className="text-sm font-medium text-slate-700">
                  Track Inventory
                </span>
                <input
                  type="checkbox"
                  checked={formData.track_inventory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      track_inventory: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>

          {/* ── Submit ────────────────────────────────────────────── */}
          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <Button
              type="submit"
              disabled={loading}
              variant="gradient"
              className="flex-1 h-12 text-base"
            >
              {loading
                ? "Saving..."
                : isEdit
                ? "Update Product"
                : "Create Product"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/products")}
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
