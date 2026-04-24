"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateBanner, useUpdateBanner, useRemainingSlots, useCategories, useProducts } from "@/hooks";
import { useRouter } from "next/navigation";
import { Banner, BannerRedirectType, BannerType, BannerPosition, BANNER_TYPE_LIMITS } from "@/domain";
import { AlertCircle, Info } from "lucide-react";

interface BannerFormProps {
  mode?: "create" | "edit";
  initialData?: Banner;
}

export default function BannerForm({ mode = "create", initialData }: BannerFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [error, setError] = useState("");
  const { data: remainingSlots } = useRemainingSlots();
  const { data: categories } = useCategories();
  const { data: productsData } = useProducts();
  const products = productsData?.products || [];

  const [formData, setFormData] = useState({
    banner_type: initialData?.banner_type || BannerType.HERO,
    position: initialData?.position || "",
    title: initialData?.title || "",
    subtitle: initialData?.subtitle || "",
    description: initialData?.description || "",
    call_to_action: initialData?.call_to_action || "",
    web_image_url: initialData?.web_image_url || "",
    redirect_type: initialData?.redirect_type || BannerRedirectType.NONE,
    redirect_target_id: initialData?.redirect_target_id || "",
    redirect_url: initialData?.redirect_url || "",
    is_active: initialData?.is_active ?? true,
    start_date: initialData?.start_date || "",
    end_date: initialData?.end_date || "",
  } as { banner_type: BannerType; position: string | null; title: string; subtitle: string; description: string; call_to_action: string; web_image_url: string; redirect_type: BannerRedirectType; redirect_target_id: string; redirect_url: string; is_active: boolean; start_date: string; end_date: string });

  const { mutate: createBanner, isPending: isCreating } = useCreateBanner();
  const { mutate: updateBanner, isPending: isUpdating } = useUpdateBanner();
  const isLoading = isCreating || isUpdating;

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
    setError("");

    if (!formData.web_image_url) {
      setError("Web banner image is required");
      return;
    }

    // Validate position based on banner type
    if (formData.banner_type === BannerType.HERO && !formData.position) {
      setError("Position is required for hero banners (1-10)");
      return;
    }

    if (formData.banner_type === BannerType.SPLIT && !formData.position) {
      setError("Position is required for split banners (left or right)");
      return;
    }

    // Auto-generate alt text from title or use default
    const altText = formData.title
      ? `${formData.title}${formData.subtitle ? ' - ' + formData.subtitle : ''} banner`
      : 'Paris Bridals promotional banner';

    // Clean up data - convert empty strings to undefined for optional fields
    const cleanData = {
      ...formData,
      alt_text: altText,
      priority: initialData?.priority || 0,
      redirect_type: formData.redirect_type || BannerRedirectType.NONE,
      redirect_target_id: formData.redirect_target_id || undefined,
      redirect_url: formData.redirect_url || undefined,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      description: formData.description || undefined,
      title: formData.title || undefined,
      subtitle: formData.subtitle || undefined,
      call_to_action: formData.call_to_action || undefined,
      position: formData.position || undefined,
      banner_type: formData.banner_type,
    };

    if (isEdit && initialData?.id) {
      updateBanner({ id: initialData.id, data: cleanData }, {
        onSuccess: () => {
          router.push('/dashboard/banners');
        }
      });
    } else {
      createBanner(cleanData, {
        onSuccess: () => {
          router.push('/dashboard/banners');
        }
      });
    }
  };

  return (
    <Card className="border-0 shadow-2xl w-full max-w-6xl">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-purple-600 to-primary text-white">
        <CardTitle className="text-2xl text-white">
          {isEdit ? "Edit Banner" : "Create New Banner"}
        </CardTitle>
        <p className="text-slate-100 text-sm mt-1">
          {isEdit ? "Update banner details" : "Add promotional banners to your storefront"}
        </p>
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

          {/* Banner Type Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Banner Type</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hero Banner Type */}
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.banner_type === BannerType.HERO
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-slate-200 hover:border-slate-300'
                } ${!isEdit && remainingSlots?.hero === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isEdit && remainingSlots?.hero === 0) return;
                  setFormData((prev) => ({ ...prev, banner_type: BannerType.HERO, position: '' }));
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="banner_type"
                      value={BannerType.HERO}
                      checked={formData.banner_type === BannerType.HERO}
                      onChange={() => {}}
                      disabled={!isEdit && remainingSlots?.hero === 0}
                      className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    />
                    <span className="font-semibold text-slate-900">Hero</span>
                  </div>
                  {!isEdit && (
                    <span className="text-xs font-medium text-slate-500">
                      {BANNER_TYPE_LIMITS[BannerType.HERO] - (remainingSlots?.hero ?? 10)}/{BANNER_TYPE_LIMITS[BannerType.HERO]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">Large carousel banners (max 10)</p>
                {!isEdit && remainingSlots?.hero === 0 && (
                  <p className="text-xs text-red-600 mt-2">Limit reached - delete existing to add more</p>
                )}
              </div>

              {/* Editorial Banner Type */}
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.banner_type === BannerType.EDITORIAL
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-slate-200 hover:border-slate-300'
                } ${!isEdit && remainingSlots?.editorial === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isEdit && remainingSlots?.editorial === 0) return;
                  setFormData((prev) => ({ ...prev, banner_type: BannerType.EDITORIAL, position: null }));
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="banner_type"
                      value={BannerType.EDITORIAL}
                      checked={formData.banner_type === BannerType.EDITORIAL}
                      onChange={() => {}}
                      disabled={!isEdit && remainingSlots?.editorial === 0}
                      className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    />
                    <span className="font-semibold text-slate-900">Editorial</span>
                  </div>
                  {!isEdit && (
                    <span className="text-xs font-medium text-slate-500">
                      {BANNER_TYPE_LIMITS[BannerType.EDITORIAL] - (remainingSlots?.editorial ?? 1)}/{BANNER_TYPE_LIMITS[BannerType.EDITORIAL]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">Featured content banners (max 1)</p>
                {!isEdit && remainingSlots?.editorial === 0 && (
                  <p className="text-xs text-red-600 mt-2">Limit reached - delete existing to add more</p>
                )}
              </div>

              {/* Split Banner Type */}
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.banner_type === BannerType.SPLIT
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-slate-200 hover:border-slate-300'
                } ${!isEdit && remainingSlots?.split === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isEdit && remainingSlots?.split === 0) return;
                  setFormData((prev) => ({ ...prev, banner_type: BannerType.SPLIT, position: '' }));
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="banner_type"
                      value={BannerType.SPLIT}
                      checked={formData.banner_type === BannerType.SPLIT}
                      onChange={() => {}}
                      disabled={!isEdit && remainingSlots?.split === 0}
                      className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    />
                    <span className="font-semibold text-slate-900">Split</span>
                  </div>
                  {!isEdit && (
                    <span className="text-xs font-medium text-slate-500">
                      {BANNER_TYPE_LIMITS[BannerType.SPLIT] - (remainingSlots?.split ?? 2)}/{BANNER_TYPE_LIMITS[BannerType.SPLIT]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">Side-by-side promo banners (max 2)</p>
                {!isEdit && remainingSlots?.split === 0 && (
                  <p className="text-xs text-red-600 mt-2">Limit reached - delete existing to add more</p>
                )}
              </div>
            </div>
          </div>

          {/* Position Field (for Hero and Split banners) */}
          {formData.banner_type === BannerType.HERO && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">
                Position <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.position || ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="1-10"
                  className="w-24 h-12 border-slate-300 focus:border-primary"
                  required
                />
                <p className="text-sm text-slate-500">Position in carousel (1 = first, 10 = last)</p>
              </div>
            </div>
          )}

          {formData.banner_type === BannerType.SPLIT && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">
                Position <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="split_position"
                    value={BannerPosition.LEFT}
                    checked={formData.position === BannerPosition.LEFT}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">Left</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="split_position"
                    value={BannerPosition.RIGHT}
                    checked={formData.position === BannerPosition.RIGHT}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">Right</span>
                </label>
              </div>
            </div>
          )}

          {/* Image Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Banner Images</h3>

            <FileUpload
              label="Banner Image *"
              accept="image/*"
              multiple={false}
              maxSize={5 * 1024 * 1024}
              folder="banners"
              value={formData.web_image_url ? [formData.web_image_url] : []}
              onChange={(urls) =>
                setFormData((prev) => ({ ...prev, web_image_url: urls[0] || "" }))
              }
              helperText="Upload banner image (max 5MB, recommended: 1920x600px)"
            />
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
              <label className="text-sm font-semibold text-slate-700 block">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the banner"
                className="h-12 border-slate-300 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          {/* Redirect Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Redirect Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Redirect Type</label>
                <select
                  value={formData.redirect_type}
                  onChange={(e) => setFormData({ ...formData, redirect_type: e.target.value as any, redirect_target_id: '', redirect_url: '' })}
                  className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                >
                  <option value="none">None</option>
                  <option value="category">Category</option>
                  <option value="subcategory">Subcategory</option>
                  <option value="subvariant">Subvariant</option>
                  <option value="product">Product</option>
                  <option value="url">URL</option>
                </select>
              </div>

              {/* Category Dropdown */}
              {formData.redirect_type === 'category' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Select Category</label>
                  <select
                    value={formData.redirect_target_id || ''}
                    onChange={(e) => setFormData({ ...formData, redirect_target_id: e.target.value })}
                    className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                  >
                    <option value="">Select a category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Product Dropdown */}
              {formData.redirect_type === 'product' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Select Product</label>
                  <select
                    value={formData.redirect_target_id || ''}
                    onChange={(e) => setFormData({ ...formData, redirect_target_id: e.target.value })}
                    className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                  >
                    <option value="">Select a product</option>
                    {products?.map((prod: any) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* URL Input */}
              {formData.redirect_type === 'url' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Redirect URL</label>
                  <Input
                    value={formData.redirect_url}
                    onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                    placeholder="https://example.com/target"
                    className="h-12 border-slate-300 focus:border-primary"
                  />
                  <p className="text-xs text-slate-500">Full URL when redirect type is "URL"</p>
                </div>
              )}
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

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
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
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <Button type="submit" disabled={isLoading} variant="gradient" className="flex-1 h-12 text-base">
              {isLoading ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Banner" : "Create Banner")}
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
