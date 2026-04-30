/**
 * ProductForm Component — Redesigned for Speed
 *
 * Two-column layout (65/35 split). All branches shown inline with quantity
 * inputs — no dropdown/add cycle. "Save & Add Another" for batch entry.
 * Sticky action bar always visible.
 *
 * @component
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Store, Wand2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Switch } from "@/components/ui/switch";
import { type Category } from "@/domain/types/category";
import { type Product } from "@/domain/types/product";
import { useAppStore } from "@/stores";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useBranches } from "@/hooks";

const MAX_IMAGES = 5;

interface Branch {
  id: string;
  name: string;
  address?: string;
  is_active?: boolean;
}

interface BranchStockEntry {
  id?: string;
  branch_id: string;
  quantity: number;
}

interface ProductFormProps {
  product?: Product;
}

/* ── Helper: default empty form state ──────────────────────────────── */
function emptyFormData() {
  return {
    name: "",
    slug: "",
    sku: "",
    barcode: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    subvariant_id: "",
    price_per_day: 0,
    is_active: true,
  };
}

export default function ProductForm({
  product,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const { showError, showSuccess, user } = useAppStore();
  const queryClient = useQueryClient();
  const { createProduct } = useCreateProduct();
  const { updateProduct } = useUpdateProduct();
  const { categories, isLoading: isCategoriesLoading } = useCategories();
  const { branches, isLoading: isBranchesLoading } = useBranches();

  // ── Async-Resilience Guard ──────────────────────────────────────
  // Block submission until all async dependencies are resolved.
  // This prevents the "impedance mismatch" where the form tries
  // to use data that hasn't arrived from the network yet.
  const isFormReady = !isCategoriesLoading && !isBranchesLoading;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Barcode uniqueness validation
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [isCheckingBarcode, setIsCheckingBarcode] = useState(false);
  const barcodeCheckTimer = useRef<NodeJS.Timeout | null>(null);

  const existingImages: string[] = (product?.images || [])
    .map((img) => (typeof img === "string" ? img : img.url))
    .filter(Boolean) as string[];
  const [imageUrls, setImageUrls] = useState<string[]>(existingImages);

  const [formData, setFormData] = useState(() =>
    product
      ? {
          name: product.name ?? "",
          slug: product.slug ?? "",
          sku: product.sku ?? "",
          barcode: product.barcode ?? "",
          description: product.description ?? "",
          category_id: product.category_id ?? "",
          subcategory_id: product.subcategory_id ?? "",
          subvariant_id: product.subvariant_id ?? "",
          price_per_day: product.price_per_day ?? 0,
          is_active: product.is_active ?? true,
        }
      : emptyFormData()
  );

  // ── Branch inventory — flat map ───────────────────────────────────
  const activeBranches = branches.filter((b) => b.is_active !== false);

  // branchStocks holds quantities keyed by branch_id.
  // For create mode: pre-populate all active branches at qty 0.
  // For edit mode: starts empty, populated by API fetch below.
  const [branchStocks, setBranchStocks] = useState<BranchStockEntry[]>([]);
  
  // Pre-fill active branches for create mode once branches are loaded
  useEffect(() => {
    if (!isEdit && activeBranches.length > 0 && branchStocks.length === 0) {
      setBranchStocks(activeBranches.map((b: any) => ({ branch_id: b.id, quantity: 0 })));
    }
  }, [activeBranches, isEdit, branchStocks.length]);
  const [removedInventoryIds] = useState<string[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Edit mode: load existing inventory
  useEffect(() => {
    if (!product?.id) return;
    const load = async () => {
      setIsLoadingInventory(true);
      try {
        const res = await fetch(`/api/branch-inventory?product_id=${product.id}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const existing = json.data.map(
            (inv: { id: string; branch_id: string; quantity: number }) => ({
              id: inv.id,
              branch_id: inv.branch_id,
              quantity: inv.quantity ?? 0,
            })
          );
          // Merge: show all active branches, pre-filling qty from API
          const merged = activeBranches.map((b) => {
            const found = existing.find(
              (e: BranchStockEntry) => e.branch_id === b.id
            );
            return found || { branch_id: b.id, quantity: 0 };
          });
          setBranchStocks(merged);
        }
      } catch (err) {
        console.error("Failed to load branch inventory:", err);
      } finally {
        setIsLoadingInventory(false);
      }
    };
    load();
     
  }, [product?.id]);

  // ── Helpers ────────────────────────────────────────────────────────
  const generateSlug = (name: string): string =>
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-");

  const getTimestampStr = () => Date.now().toString(36).toUpperCase();
  const getRandomStr = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const getRandom4Digit = () => Math.floor(1000 + Math.random() * 9000);

  const generateBarcode = () => {
    const barcode = `PB${getTimestampStr()}${getRandomStr()}`;
    setFormData((prev) => ({ ...prev, barcode }));
    setBarcodeError(null);
    checkBarcodeUniqueness(barcode);
  };

  // Debounced barcode uniqueness check
  const checkBarcodeUniqueness = (barcode: string) => {
    if (barcodeCheckTimer.current) clearTimeout(barcodeCheckTimer.current);
    if (!barcode || barcode.trim().length === 0) {
      setBarcodeError(null);
      setIsCheckingBarcode(false);
      return;
    }
    setIsCheckingBarcode(true);
    barcodeCheckTimer.current = setTimeout(async () => {
      try {
        const excludeParam = product?.id ? `&exclude=${product.id}` : '';
        const res = await fetch(`/api/products/check-barcode?code=${encodeURIComponent(barcode.trim())}${excludeParam}`);
        const json = await res.json();
        if (json.success && json.data) {
          if (!json.data.unique) {
            setBarcodeError(`Already assigned to "${json.data.existing_product}"`);
          } else {
            setBarcodeError(null);
          }
        }
      } catch {
        // Silently ignore network errors for validation
      } finally {
        setIsCheckingBarcode(false);
      }
    }, 500);
  };

  const generateSKU = () => {
    const catName = categories.find((c) => c.id === formData.category_id)?.name;
    const prefix = catName ? catName.substring(0, 3).toUpperCase() : "PB";
    const random = getRandom4Digit();
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${random}` }));
  };

  const clearZeroOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") e.target.value = "";
  };

  // Prevent scroll on number inputs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "number") {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // Category hierarchy
  const mains = categories.filter((c) => !c.parent_id);
  const subs = categories.filter((c) => c.parent_id === formData.category_id);
  const variants = categories.filter(
    (c) => c.parent_id === formData.subcategory_id
  );

  const handleMainCategoryChange = (value: string) =>
    setFormData((prev) => ({
      ...prev,
      category_id: value,
      subcategory_id: "",
      subvariant_id: "",
    }));

  const handleSubCategoryChange = (value: string) =>
    setFormData((prev) => ({ ...prev, subcategory_id: value, subvariant_id: "" }));

  const totalBranchQuantity = branchStocks.reduce(
    (sum, s) => sum + (s.quantity || 0),
    0
  );

  const handleStockChange = (branchId: string, qty: number) => {
    setBranchStocks((prev) =>
      prev.map((s) => (s.branch_id === branchId ? { ...s, quantity: qty } : s))
    );
  };

  const getBranchName = (id: string) =>
    branches.find((b) => b.id === id)?.name || "Unknown";

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (continueAdding: boolean = false) => {
      setLoading(true);
      setError("");

      try {
        const activeStocks = branchStocks.filter((s) => s.quantity > 0);
        if (activeStocks.length === 0) {
          showError("Add stock to at least one branch");
          setLoading(false);
          return;
        }

        if (!formData.name.trim()) {
          showError("Product name is required");
          setLoading(false);
          return;
        }

        if (barcodeError) {
          showError("Please fix the barcode error before saving");
          setLoading(false);
          return;
        }

        const images = imageUrls.map((url, index) => ({
          url,
          alt_text: formData.name,
          is_primary: index === 0,
          sort_order: index,
        }));

        const basePayload = {
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          images,
          // NOTE: store_id is deliberately ABSENT here.
          // The server injects it from the auth cookie (Zero-Trust).
          // This eliminates the race condition where user?.store_id
          // was undefined because Zustand hadn't finished hydrating.
          category_id: formData.category_id || undefined,
          subcategory_id: formData.subcategory_id || undefined,
          subvariant_id: formData.subvariant_id || undefined,
          security_deposit: 0,
          is_featured: false,
          track_inventory: true,
          low_stock_threshold: 0,
          price_per_day: formData.price_per_day,
          quantity: totalBranchQuantity,
          available_quantity: totalBranchQuantity,
          is_active: formData.is_active,
          sku: formData.sku || undefined,
          barcode: formData.barcode || undefined,
          description: formData.description || undefined,
          branch_inventory: branchStocks.filter((s) => s.id || s.quantity > 0).map(s => ({
            id: s.id,
            branch_id: s.branch_id,
            quantity: s.quantity
          })),
        };

        if (isEdit && product) {
          // Include items removed from inventory in edit mode
          (basePayload as any).removed_inventory_ids = removedInventoryIds;
          await updateProduct({ id: product.id, data: basePayload as any });
        } else {
          await createProduct(basePayload as any);
        }

        // With Optimistic UI, success UI and cache invalidation are handled by the hook
        // We just need to navigate or reset the form.

        if (continueAdding && !isEdit) {
          // Reset form for next product
          setFormData(emptyFormData());
          setImageUrls([]);
          setSlugManuallyEdited(false);
          setBranchStocks(
            activeBranches.map((b) => ({ branch_id: b.id, quantity: 0 }))
          );
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          router.push("/dashboard/products");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        console.error("Error saving product:", err);
        showError(message);
      } finally {
        setLoading(false);
      }
    },
     
    [
      formData,
      imageUrls,
      branchStocks,
      removedInventoryIds,
      isEdit,
      product,
      totalBranchQuantity,
    ]
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/products")}
            className="w-9 h-9 border-slate-200 text-slate-500 hover:text-slate-900 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isEdit ? "Edit Product" : "Add Product"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEdit
                ? "Update details and stock allocation"
                : "Fill in the essentials — you can always edit later"}
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* ═══ Two-column layout ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN (2/3) ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Name */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name: newName,
                    slug: slugManuallyEdited
                      ? prev.slug
                      : generateSlug(newName),
                  }));
                }}
                required
                placeholder="e.g., Diamond Necklace Set"
                className="h-11 border-slate-200 focus:border-slate-900 text-base"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Materials, occasion, style details... (optional)"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
              />
            </div>
          </div>

          {/* Media */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Images</h3>
            <FileUpload
              accept="image/*"
              multiple={true}
              maxFiles={MAX_IMAGES}
              maxSize={20 * 1024 * 1024}
              folder="products"
              value={imageUrls}
              onChange={setImageUrls}
              helperText={`Drag & drop up to ${MAX_IMAGES} images. First image = primary.`}
            />
          </div>

          {/* Rent Price + Category — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rent Price */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Rent Price <span className="text-red-500">*</span>
              </h3>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-base">
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
                  className="h-12 pl-8 border-slate-200 focus:border-slate-900 font-bold text-xl"
                />
              </div>
              <p className="text-xs text-slate-400">
                Same price across all branches
              </p>
            </div>

            {/* Categories */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Category</h3>
              <select
                value={formData.category_id}
                onChange={(e) => handleMainCategoryChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
              >
                <option value="">Select category</option>
                {mains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {subs.length > 0 && (
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                >
                  <option value="">Select subcategory</option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {variants.length > 0 && (
                <select
                  value={formData.subvariant_id}
                  onChange={(e) =>
                    setFormData({ ...formData, subvariant_id: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                >
                  <option value="">Select variant</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (1/3) ───────────────────────────────────── */}
        <div className="space-y-6">
          {/* Status Toggle */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Active Listing
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visible in storefront
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          {/* Identifiers: SKU + Barcode */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Identifiers
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                SKU
              </label>
              <div className="flex gap-1.5">
                <Input
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="e.g., PB-NK-001"
                  className="h-9 border-slate-200 focus:border-slate-900 font-mono text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateSKU}
                  className="h-9 w-9 border-slate-200 text-slate-500 hover:text-slate-900 shrink-0"
                  title="Auto-generate SKU"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Barcode
              </label>
              <div className="flex gap-1.5">
                <Input
                  value={formData.barcode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, barcode: val });
                    checkBarcodeUniqueness(val);
                  }}
                  className={`h-9 border-slate-200 focus:border-slate-900 font-mono text-xs flex-1 ${barcodeError ? 'border-red-400 focus:border-red-500' : ''}`}
                  placeholder="Auto-generated"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateBarcode}
                  className="h-9 w-9 border-slate-200 text-slate-500 hover:text-slate-900 shrink-0"
                  title="Auto-generate Barcode"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
              {barcodeError && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {barcodeError}
                </p>
              )}
              {isCheckingBarcode && (
                <p className="text-xs text-slate-400 mt-1">Checking availability...</p>
              )}
            </div>
            {/* URL Slug (collapsed, auto-generated) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                URL Slug
              </label>
              <Input
                value={formData.slug}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, slug: e.target.value }));
                  setSlugManuallyEdited(e.target.value.length > 0);
                }}
                placeholder="auto-generated"
                className="h-9 border-slate-200 focus:border-slate-900 font-mono text-xs"
              />
            </div>
          </div>

          {/* Branch Inventory — ALL branches inline */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Stock by Branch
              </h3>
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                Total: {totalBranchQuantity}
              </span>
            </div>

            {isLoadingInventory || isBranchesLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900" />
              </div>
            ) : activeBranches.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No active branches configured.
              </p>
            ) : (
              <div className="space-y-2">
                {branchStocks.map((entry) => (
                  <div
                    key={entry.branch_id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Store className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {getBranchName(entry.branch_id)}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={entry.quantity}
                      onChange={(e) =>
                        handleStockChange(
                          entry.branch_id,
                          parseInt(e.target.value) || 0
                        )
                      }
                      onFocus={clearZeroOnFocus}
                      className="h-8 w-20 text-center font-bold border-slate-200 focus:border-slate-900"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Sticky Action Bar ═══ */}
      <div className="sticky bottom-0 z-10 -mx-8 px-8 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/products")}
            className="h-10 border-slate-200 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                disabled={loading || !isFormReady}
                onClick={() => handleSubmit(true)}
                className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                {loading ? "Saving..." : !isFormReady ? "Loading..." : "Save & Add Another"}
              </Button>
            )}
            <Button
              type="button"
              disabled={loading || !isFormReady}
              onClick={() => handleSubmit(false)}
              className="h-10 px-6 bg-slate-900 text-white hover:bg-slate-800 font-semibold"
            >
              {loading
                ? "Saving..."
                : !isFormReady
                ? "Loading..."
                : isEdit
                ? "Save Changes"
                : "Create Product"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
