"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCategory } from "@/lib/supabase/queries";
import { useRouter } from "next/navigation";

export default function CategoryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    sort_order: 0,
    is_active: true,
    is_global: false,
    parent_id: null as string | null,
    store_id: null as string | null,
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
      await createCategory(formData);
      router.push("/dashboard/categories");
      router.refresh();
    } catch (error) {
      console.error("Error creating category:", error);
      alert("Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl w-full max-w-6xl">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-purple-600 to-primary text-white">
        <CardTitle className="text-2xl text-white">Create New Category</CardTitle>
        <p className="text-slate-100 text-sm mt-1">Organize your products into categories</p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
                placeholder="earrings"
                className="h-12 border-slate-300 focus:border-primary"
              />
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

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Image URL</label>
            <Input
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/category-image.png"
              className="h-12 border-slate-300 focus:border-primary"
            />
          </div>

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
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Parent Category ID</label>
              <Input
                value={formData.parent_id || ""}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                placeholder="UUID of parent category"
                className="h-12 border-slate-300 focus:border-primary"
              />
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
            <Button type="submit" loading={loading} className="flex-1 h-12 text-base shadow-lg shadow-primary/25">
              {loading ? "Creating..." : "Create Category"}
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
