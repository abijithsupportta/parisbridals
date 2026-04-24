/**
 * ProductForm Component (Standalone Page)
 *
 * Multi-branch product form: shared rent price, per-branch stock counts.
 * Flow: select a branch from dropdown → enter stock count → click Add.
 * Repeat for each branch that should carry this product.
 *
 * @component
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Store, X, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { type Category } from "@/domain/types/category";
import { useAppStore } from "@/stores";
import { useCreateProduct, useUpdateProduct } from "@/hooks";

const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000001";
const MAX_IMAGES = 5;

interface Branch {
  id: string;
  name: string;
  address?: string;
  is_active?: boolean;
}

interface BranchStockEntry {
  id?: string; // branch_inventory row id when loaded from DB
  branch_id: string;
  quantity: number;
}

interface ProductFormProps {
  product?: any;
  categories?: Category[];
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

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Existing images
  const existingImages = (product?.images || []).map((img: any) =>
    typeof img === "string" ? img : img.url
  );
  const [imageUrls, setImageUrls] = useState<string[]>(existingImages);

  // Core form fields (shared across all branches)
  const [formData, setFormData] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    sku: product?.sku || "",
    barcode: product?.barcode || "",
    description: product?.description || "",
    category_id: product?.category_id || "",
    subcategory_id: product?.subcategory_id || "",
    subvariant_id: product?.subvariant_id || "",
    price_per_day: product?.price_per_day || 0,
    is_active: product?.is_active ?? true,
  });

  // Per-branch stock state
  const [branchStocks, setBranchStocks] = useState<BranchStockEntry[]>([]);
  const [removedInventoryIds, setRemovedInventoryIds] = useState<string[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Load existing branch inventory when editing
  useEffect(() => {
    if (!product?.id) return;
    const load = async () => {
      setIsLoadingInventory(true);
      try {
        const res = await fetch(`/api/branch-inventory?product_id=${product.id}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setBranchStocks(
            json.data.map((inv: any) => ({
              id: inv.id,
              branch_id: inv.branch_id,
              quantity: inv.quantity ?? 0,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load branch inventory:", err);
      } finally {
        setIsLoadingInventory(false);
      }
    };
    load();
  }, [product?.id]);

  // Slug auto-generation
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

  // Barcode generation
  const generateBarcode = () => {
    const barcode = `PB${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
    setFormData((prev) => ({ ...prev, barcode }));
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

  // ── Branch Stock Handlers ────────────────────────────────────────
  const activeBranches = branches.filter((b) => b.is_active !== false);
  const availableBranches = activeBranches.filter(
    (b) => !branchStocks.some((s) => s.branch_id === b.id)
  );
  const totalBranchQuantity = branchStocks.reduce(
    (sum, s) => sum + (s.quantity || 0),
    0
  );
  const getBranchName = (id: string) =>
    branches.find((b) => b.id === id)?.name || "Unknown";

  const handleAddBranchStock = () => {
    if (!selectedBranchId) {
      showError("Select a branch first");
      return;
    }
    if (newStockQty < 0) {
      showError("Stock count cannot be negative");
      return;
    }
    if (branchStocks.some((s) => s.branch_id === selectedBranchId)) {
      showError("This branch is already added");
      return;
    }
    setBranchStocks((prev) => [
      ...prev,
      { branch_id: selectedBranchId, quantity: newStockQty },
    ]);
    setSelectedBranchId("");
    setNewStockQty(0);
  };

  const handleUpdateStockQty = (branchId: string, qty: number) => {
    setBranchStocks((prev) =>
      prev.map((s) => (s.branch_id === branchId ? { ...s, quantity: qty } : s))
    );
  };

  const handleRemoveBranchStock = (branchId: string) => {
    setBranchStocks((prev) => {
      const entry = prev.find((s) => s.branch_id === branchId);
      if (entry?.id) setRemovedInventoryIds((ids) => [...ids, entry.id!]);
      return prev.filter((s) => s.branch_id !== branchId);
    });
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (branchStocks.length === 0) {
        showError("Add stock for at least one branch");
        setLoading(false);
        return;
      }

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
        // Branch-specific: no top-level branch_id; stock lives in branch_inventory.
        branch_id: null,
        security_deposit: 0, // not used
        is_featured: false, // not used
        track_inventory: true, // always tracked
        low_stock_threshold: 0, // not used at product level
        quantity: totalBranchQuantity, // auto-summed across branches
        available_quantity: totalBranchQuantity,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        description: formData.description || undefined,
      };

      let productId: string;
      let result: any;
      if (isEdit && product) {
        result = await updateProduct.mutateAsync({ id: product.id, data: payload });
        productId = product.id;
      } else {
        result = await createProduct.mutateAsync(payload);
        productId = result?.data?.id;
      }

      if (!result?.success) {
        let msg = result?.error?.message || "Request failed";
        if (result?.error?.code === "SLUG_EXISTS") {
          msg = "A product with this slug already exists.";
        } else if (result?.error?.code === "VALIDATION_ERROR") {
          msg = "Please check all required fields.";
        }
        showError(msg);
        setLoading(false);
        return;
      }

      // Persist branch inventory
      try {
        for (const rid of removedInventoryIds) {
          await fetch(`/api/branch-inventory/${rid}`, { method: "DELETE" });
        }
        for (const entry of branchStocks) {
          if (entry.id) {
            await fetch(`/api/branch-inventory/${entry.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                quantity: entry.quantity,
                available_quantity: entry.quantity,
                low_stock_threshold: 0,
              }),
            });
          } else {
            await fetch("/api/branch-inventory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                branch_id: entry.branch_id,
                product_id: productId,
                quantity: entry.quantity,
                available_quantity: entry.quantity,
                low_stock_threshold: 0,
              }),
            });
          }
        }
      } catch (invErr) {
        console.error("Branch inventory save error:", invErr);
        showError("Product saved, but some branch stock may not have been persisted");
      }

      showSuccess(isEdit ? "Product updated" : "Product created");
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
            ? "Update product details and per-branch stock"
            : "Add a new item and assign stock to each branch"}
        </p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── Product Images ─────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Product Images
            </h3>
            <FileUpload
              accept="image/*"
              multiple={true}
              maxFiles={MAX_IMAGES}
              maxSize={5 * 1024 * 1024}
              folder="products"
              value={imageUrls}
              onChange={setImageUrls}
              helperText={`Upload up to ${MAX_IMAGES} images (max 5MB each). Images are optional.`}
            />
          </div>

          {/* ── Basic Information ──────────────────────────────────── */}
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

          {/* ── Identifiers ────────────────────────────────────────── */}
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

          {/* ── Categories ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          {/* ── Rent Price (common across branches) ────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Rent Price
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <p className="text-xs text-slate-500">
                  Same rate applies across all branches.
                </p>
              </div>
            </div>
          </div>

          {/* ── Stock per Branch ───────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-violet-600" />
                Stock per Branch *
              </h3>
              <span className="text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
                Total: {totalBranchQuantity}
              </span>
            </div>
            <p className="text-sm text-slate-500 -mt-2">
              Stock is tracked <strong>separately for each branch</strong>. Pick a
              branch, enter its stock count, click Add. Then pick the next branch
              and repeat.
            </p>

            {isLoadingInventory ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Loading existing stock...
              </p>
            ) : activeBranches.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                No active branches. Please create a branch first.
              </div>
            ) : (
              <>
                {/* Add stock form */}
                {availableBranches.length > 0 ? (
                  <div className="p-5 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40">
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-3">
                      Add Stock for a Branch
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-600 font-medium">
                          Branch
                        </label>
                        <select
                          value={selectedBranchId}
                          onChange={(e) => setSelectedBranchId(e.target.value)}
                          className="w-full h-11 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                        >
                          <option value="">Select a branch</option>
                          {availableBranches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-600 font-medium">
                          Stock Count
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={newStockQty}
                          onChange={(e) =>
                            setNewStockQty(parseInt(e.target.value) || 0)
                          }
                          onFocus={clearZeroOnFocus}
                          placeholder="0"
                          className="h-11 bg-white border-slate-300 focus:border-primary"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={handleAddBranchStock}
                          disabled={!selectedBranchId}
                          className="h-11 bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                    Stock configured for all available branches.
                  </div>
                )}

                {/* List of added branch stocks */}
                {branchStocks.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4 italic">
                    No branch stock added yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Branches with Stock ({branchStocks.length})
                    </p>
                    {branchStocks.map((entry) => (
                      <div
                        key={entry.branch_id}
                        className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-white hover:border-violet-200 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {getBranchName(entry.branch_id)}
                          </p>
                          <p className="text-xs text-slate-500">Branch stock</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">Qty:</label>
                          <Input
                            type="number"
                            min={0}
                            value={entry.quantity}
                            onChange={(e) =>
                              handleUpdateStockQty(
                                entry.branch_id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            onFocus={clearZeroOnFocus}
                            className="h-10 w-24 text-center font-semibold border-slate-300"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveBranchStock(entry.branch_id)
                            }
                            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove this branch"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Status (Active switch only) ────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Status
            </h3>
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100 max-w-md">
              <div>
                <p className="text-sm font-semibold text-slate-800">Active</p>
                <p className="text-xs text-slate-500">
                  Visible to customers and available for rental
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

          {/* ── Submit ─────────────────────────────────────────────── */}
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
