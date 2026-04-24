"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateBanner, useUpdateBanner } from "@/hooks";
import { useRouter } from "next/navigation";
import { Banner, BannerRedirectType } from "@/domain";
import { AlertCircle } from "lucide-react";

interface BannerFormProps {
  mode?: "create" | "edit";
  initialData?: Banner;
}

export default function BannerForm({ mode = "create", initialData }: BannerFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    subtitle: initialData?.subtitle || "",
    description: initialData?.description || "",
    call_to_action: initialData?.call_to_action || "",
    web_image_url: initialData?.web_image_url || "",
    mobile_image_url: initialData?.mobile_image_url || "",
    redirect_type: initialData?.redirect_type || BannerRedirectType.NONE,
    redirect_target_id: initialData?.redirect_target_id || "",
    redirect_url: initialData?.redirect_url || "",
    is_active: initialData?.is_active ?? true,
    start_date: initialData?.start_date || "",
    end_date: initialData?.end_date || "",
  });

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
      mobile_image_url: formData.mobile_image_url || undefined,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      description: formData.description || undefined,
      title: formData.title || undefined,
      subtitle: formData.subtitle || undefined,
      call_to_action: formData.call_to_action || undefined,
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

          {/* Image Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Banner Images</h3>
            
            <FileUpload
              label="Web Banner Image *"
              accept="image/*"
              multiple={false}
              maxSize={5 * 1024 * 1024}
              folder="banners"
              value={formData.web_image_url ? [formData.web_image_url] : []}
              onChange={(urls) =>
                setFormData((prev) => ({ ...prev, web_image_url: urls[0] || "" }))
              }
              helperText="Upload web banner image (max 5MB, recommended: 1920x600px)"
            />

            <FileUpload
              label="Mobile Banner Image"
              accept="image/*"
              multiple={false}
              maxSize={5 * 1024 * 1024}
              folder="banners"
              value={formData.mobile_image_url ? [formData.mobile_image_url] : []}
              onChange={(urls) =>
                setFormData((prev) => ({ ...prev, mobile_image_url: urls[0] || "" }))
              }
              helperText="Upload mobile banner image (max 5MB, recommended: 800x600px)"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Redirect Type</label>
                <select
                  value={formData.redirect_type}
                  onChange={(e) => setFormData({ ...formData, redirect_type: e.target.value as any })}
                  className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
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
                <p className="text-xs text-slate-500">Full URL when redirect type is "URL"</p>
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
