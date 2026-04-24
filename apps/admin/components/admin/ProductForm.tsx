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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { type Category } from "@/domain/types/category";
import { type Product, type CreateProductDTO, type UpdateProductDTO } from "@/domain/types/product";
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
  product?: Product;
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

  const existingImages: string[] = (product?.images || []).map((img) =>
    typeof img === "string" ? img : img.url
  ).filter(Boolean) as string[];
  const [imageUrls, setImageUrls] = useState<string[]>(existingImages);

  // Core form fields (shared across all branches)
  const [formData, setFormData] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id ?? "",
    subcategory_id: product?.subcategory_id ?? "",
    subvariant_id: product?.subvariant_id ?? "",
    price_per_day: product?.price_per_day ?? 0,
    is_active: product?.is_active ?? true,
  });

  // Per-branch stock state
  const [branchStocks, setBranchStocks] = useState<BranchStockEntry[]>([]);
  const [removedInventoryIds, setRemovedInventoryIds] = useState<string[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  useEffect(() => {
    if (!product?.id) return;
    const load = async () => {
      setIsLoadingInventory(true);
      try {
        const res = await fetch(`/api/branch-inventory?product_id=${product.id}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setBranchStocks(
            json.data.map((inv: { id: string; branch_id: string; quantity: number }) => ({
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

      const basePayload = {
        name: formData.name,
        slug: formData.slug,
        images,
        store_id: DEFAULT_STORE_ID,
        category_id: formData.category_id || undefined,
        subcategory_id: formData.subcategory_id || undefined,
        subvariant_id: formData.subvariant_id || undefined,
        branch_id: undefined,
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
      };

      let productId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;
      if (isEdit && product) {
        result = await updateProduct.mutateAsync({ id: product.id, data: basePayload as UpdateProductDTO });
        productId = product.id;
      } else {
        result = await createProduct.mutateAsync(basePayload as CreateProductDTO);
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
    <Card className="shadow-sm border-slate-200 bg-white w-full max-w-4xl mx-auto overflow-hidden">
      <CardHeader className="border-b border-slate-200 bg-white pb-6 pt-6">
        <CardTitle className="text-xl font-semibold text-slate-900">
          {isEdit ? "Edit Product Details" : "Create New Product"}
        </CardTitle>
        <CardDescription className="text-slate-500 mt-1 text-sm">
          {isEdit
            ? "Update the product information and per-branch stock allocation."
            : "Fill in the details below to add a new item to your catalog."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {/* ── Product Images ─────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Product Imagery
            </h3>
            <FileUpload
              accept="image/*"
              multiple={true}
              maxFiles={MAX_IMAGES}
              maxSize={5 * 1024 * 1024}
              folder="products"
              value={imageUrls}
              onChange={setImageUrls}
              helperText={`Upload up to ${MAX_IMAGES} images (max 5MB each). PNG or JPG.`}
            />
          </div>

          {/* ── Basic Information ──────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData((prev) => ({ 
                      ...prev, 
                      name: newName,
                      slug: slugManuallyEdited ? prev.slug : generateSlug(newName)
                    }));
                  }}
                  required
                  placeholder="e.g., Diamond Necklace Set"
                  className="h-11 border-slate-200 focus:border-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                  URL Slug <span className="text-red-500">*</span>
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
                  className="h-11 border-slate-200 focus:border-slate-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Materials, occasion, style details..."
                rows={4}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
              />
            </div>
          </div>

          {/* ── Identifiers ────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Identifiers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                  SKU (Stock Keeping Unit)
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="e.g., PB-NK-001"
                  className="h-11 border-slate-200 focus:border-slate-900 font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                  Barcode
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="Auto-generated"
                    className="flex-1 h-11 border-slate-200 focus:border-slate-900 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateBarcode}
                    className="h-11 px-3 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    title="Generate random barcode"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Categories ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Classification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                  Main Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleMainCategoryChange(e.target.value)}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
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
                <label className="text-sm font-medium text-slate-700 block">
                  Subcategory
                </label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  disabled={!formData.category_id || subs.length === 0}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none disabled:opacity-50 disabled:bg-slate-50"
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
                <label className="text-sm font-medium text-slate-700 block">
                  Variant
                </label>
                <select
                  value={formData.subvariant_id}
                  onChange={(e) =>
                    setFormData({ ...formData, subvariant_id: e.target.value })
                  }
                  disabled={!formData.subcategory_id || variants.length === 0}
                  className="w-full h-11 px-3 rounded-md border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none disabled:opacity-50 disabled:bg-slate-50"
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
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                  Daily Rental Rate <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
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
                    className="h-11 pl-8 border-slate-200 focus:border-slate-900 font-semibold"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Standardized rate applies across all branches.
                </p>
              </div>
            </div>
          </div>

          {/* ── Stock per Branch ───────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-end justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Inventory Allocation
              </h3>
              <div className="text-xs font-medium text-slate-500">
                Total Units: <span className="font-bold text-slate-900">{totalBranchQuantity}</span>
              </div>
            </div>

            {isLoadingInventory ? (
              <div className="flex justify-center p-8 border border-slate-200 rounded-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900" />
              </div>
            ) : activeBranches.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600 text-center">
                No active branches in the system.
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                {/* Add stock form */}
                {availableBranches.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-end gap-3 mb-6">
                    <div className="space-y-1.5 flex-1 w-full">
                      <label className="text-xs font-medium text-slate-700">
                        Assign to Branch
                      </label>
                      <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:border-slate-900 outline-none"
                      >
                        <option value="">Select branch...</option>
                        {availableBranches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 w-full md:w-32">
                      <label className="text-xs font-medium text-slate-700">
                        Initial Stock
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
                        className="h-10 border-slate-200 focus:border-slate-900 bg-white font-medium"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddBranchStock}
                      disabled={!selectedBranchId}
                      className="h-10 bg-slate-900 text-white hover:bg-slate-800 gap-1.5 w-full md:w-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add Location
                    </Button>
                  </div>
                ) : (
                  <div className="mb-6 p-3 bg-white border border-slate-200 rounded-md text-sm text-slate-500 text-center font-medium">
                    Stock allocated to all available branches.
                  </div>
                )}

                {/* List of added branch stocks */}
                {branchStocks.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-300 rounded-md p-6 text-center text-sm text-slate-400">
                    No inventory assigned yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {branchStocks.map((entry) => (
                      <div
                        key={entry.branch_id}
                        className="flex items-center justify-between p-3 rounded-md border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <Store className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-900">
                            {getBranchName(entry.branch_id)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-medium text-slate-500">Units</label>
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
                            className="h-8 w-20 text-center font-semibold border-slate-200 focus:border-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBranchStock(entry.branch_id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
                            title="Remove branch allocation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Status (Active switch only) ────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Visibility
            </h3>
            <div className="flex items-center justify-between p-5 rounded-md bg-white border border-slate-200 max-w-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">Active Listing</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Available for rent in the storefront
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
          <div className="flex gap-4 pt-8 mt-8 border-t border-slate-200">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
            >
              {loading
                ? "Saving details..."
                : isEdit
                ? "Save Changes"
                : "Create Product"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/products")}
              className="flex-1 h-12 text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
