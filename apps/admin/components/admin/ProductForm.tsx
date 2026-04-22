"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProduct } from "@/lib/supabase/queries";
import { useRouter } from "next/navigation";

export default function ProductForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    sku: "",
    category_id: "",
    store_id: "",
    description: "",
    price_per_day: 0,
    security_deposit: 0,
    quantity: 0,
    available_quantity: 0,
    images: [] as string[],
    sizes: [] as string[],
    colors: [] as string[],
    track_inventory: true,
    low_stock_threshold: 5,
    is_active: true,
    is_featured: false,
  });

  const clearZeroOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.value = "";
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await createProduct(formData);
      router.push("/dashboard/products");
      router.refresh();
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl w-full max-w-6xl">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-purple-600 to-primary text-white">
        <CardTitle className="text-2xl text-white">Create New Product</CardTitle>
        <p className="text-slate-100 text-sm mt-1">Add a new jewellery item to your inventory</p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Product Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Gold Diamond Earrings"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Slug *</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  placeholder="gold-diamond-earrings"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU-001"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Category ID *</label>
                <Input
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                  placeholder="Category UUID"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed product description"
                className="h-12 border-slate-300 focus:border-primary"
              />
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Pricing & Inventory</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Price Per Day (₹) *</label>
                <Input
                  type="number"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData({ ...formData, price_per_day: parseFloat(e.target.value) || 0 })}
                  onFocus={clearZeroOnFocus}
                  required
                  placeholder="500"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Security Deposit (₹)</label>
                <Input
                  type="number"
                  value={formData.security_deposit}
                  onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
                  onFocus={clearZeroOnFocus}
                  placeholder="1000"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Available Quantity *</label>
                <Input
                  type="number"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) || 0 })}
                  onFocus={clearZeroOnFocus}
                  required
                  placeholder="10"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Product Images</h3>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Image URLs (comma separated)</label>
              <Input
                value={formData.images.join(", ")}
                onChange={(e) => setFormData({ ...formData, images: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                placeholder="https://example.com/image1.png, https://example.com/image2.png"
                className="h-12 border-slate-300 focus:border-primary"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is_featured" className="text-sm font-medium text-slate-700">
                  Featured Product
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
                  Product is active
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <Button type="submit" loading={loading} className="flex-1 h-12 text-base shadow-lg shadow-primary/25">
              {loading ? "Creating..." : "Create Product"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
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
