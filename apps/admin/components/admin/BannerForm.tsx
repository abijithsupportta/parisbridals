"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBanner } from "@/lib/supabase/queries";
import { useRouter } from "next/navigation";

export default function BannerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    store_id: "",
    title: "",
    subtitle: "",
    description: "",
    call_to_action: "",
    web_image_url: "",
    mobile_image_url: "",
    redirect_type: "none" as const,
    redirect_target_id: "",
    redirect_url: "",
    banner_type: "hero" as "hero" | "editorial" | "split",
    is_active: true,
    priority: 0,
    start_date: "",
    end_date: "",
    alt_text: "",
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
      await createBanner(formData);
      router.push("/dashboard/banners");
      router.refresh();
    } catch (error) {
      console.error("Error creating banner:", error);
      alert("Failed to create banner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl w-full max-w-6xl">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-purple-600 to-primary text-white">
        <CardTitle className="text-2xl text-white">Create New Banner</CardTitle>
        <p className="text-slate-100 text-sm mt-1">Add promotional banners to your storefront</p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Banner Type & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Banner Type *</label>
              <select
                value={formData.banner_type}
                onChange={(e) => setFormData({ ...formData, banner_type: e.target.value as "hero" | "editorial" | "split" })}
                className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white focus:border-primary focus:outline-none"
              >
                <option value="hero">Hero Banner</option>
                <option value="editorial">Editorial Banner</option>
                <option value="split">Split Banner</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Priority *</label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                onFocus={clearZeroOnFocus}
                placeholder="0"
                className="h-12 border-slate-300 focus:border-primary"
              />
              <p className="text-xs text-slate-500">Higher numbers appear first</p>
            </div>
          </div>

          {/* Banner Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Banner Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Summer Collection Sale"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Subtitle</label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g., Up to 50% off"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Call to Action</label>
              <Input
                value={formData.call_to_action}
                onChange={(e) => setFormData({ ...formData, call_to_action: e.target.value })}
                placeholder="e.g., Shop Now"
                className="h-12 border-slate-300 focus:border-primary"
              />
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Banner Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Web Image URL *</label>
                <Input
                  value={formData.web_image_url}
                  onChange={(e) => setFormData({ ...formData, web_image_url: e.target.value })}
                  required
                  placeholder="https://example.com/banner-web.png"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Mobile Image URL</label>
                <Input
                  value={formData.mobile_image_url}
                  onChange={(e) => setFormData({ ...formData, mobile_image_url: e.target.value })}
                  placeholder="https://example.com/banner-mobile.png"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Redirect Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Redirect Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Redirect Type</label>
                <select
                  value={formData.redirect_type}
                  onChange={(e) => setFormData({ ...formData, redirect_type: e.target.value as any })}
                  className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white focus:border-primary focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="category">Category</option>
                  <option value="product">Product</option>
                  <option value="url">URL</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Redirect URL</label>
                <Input
                  value={formData.redirect_url}
                  onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                  placeholder="https://example.com/target"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Start Date</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">End Date</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Banner is active and visible
            </label>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <Button type="submit" loading={loading} className="flex-1 h-12 text-base shadow-lg shadow-primary/25">
              {loading ? "Creating..." : "Create Banner"}
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
