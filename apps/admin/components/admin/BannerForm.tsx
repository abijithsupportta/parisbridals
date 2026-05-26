/**
 * BannerForm Component — Redesigned for Consistency
 *
 * Matches the ProductForm/OrderForm design system: clean white bordered cards,
 * back-button header, sticky action bar, Switch toggle, slate-900 accent.
 *
 * @component
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { useCreateBanner, useUpdateBanner, useRemainingSlots, useCategories, useProducts, useBanners } from "@/hooks";
import { useRouter } from "next/navigation";
import { Banner, BannerRedirectType, BannerType, BannerPosition, BANNER_TYPE_LIMITS } from "@/domain";
import { AlertCircle, ArrowLeft, Check } from "lucide-react";
import { useAppStore } from "@/stores";

interface BannerFormProps {
  mode?: "create" | "edit";
  initialData?: Banner;
}

export default function BannerForm({ mode = "create", initialData }: BannerFormProps) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const isEdit = mode === "edit";
  const [error, setError] = useState("");
  const { data: remainingSlots } = useRemainingSlots();
  const { data: categories } = useCategories();
  const { data: productsData } = useProducts();
  const products = productsData?.products || [];

  // Fetch all hero banners for visual slot picker
  const { data: heroBanners } = useBanners({ banner_type: BannerType.HERO });

  // Build a map of occupied hero positions: position -> banner
  const occupiedHeroSlots = useMemo(() => {
    const map = new Map<string, Banner>();
    if (heroBanners) {
      for (const b of heroBanners) {
        if (b.position) {
          if (isEdit && initialData?.id === b.id) continue;
          map.set(b.position, b);
        }
      }
    }
    return map;
  }, [heroBanners, isEdit, initialData?.id]);

  // Fetch all split banners for position awareness
  const { data: splitBanners } = useBanners({ banner_type: BannerType.SPLIT });

  // Build a map of occupied split positions: 'left'|'right' -> banner
  const occupiedSplitPositions = useMemo(() => {
    const map = new Map<string, Banner>();
    if (splitBanners) {
      for (const b of splitBanners) {
        if (b.position) {
          if (isEdit && initialData?.id === b.id) continue;
          map.set(b.position, b);
        }
      }
    }
    return map;
  }, [splitBanners, isEdit, initialData?.id]);

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

  // Auto-select first available hero slot on create
  useEffect(() => {
    if (isEdit || formData.banner_type !== BannerType.HERO || formData.position) return;
    for (let i = 1; i <= 10; i++) {
      if (!occupiedHeroSlots.has(String(i))) {
        setFormData((prev) => ({ ...prev, position: String(i) }));
        break;
      }
    }
  }, [occupiedHeroSlots, formData.banner_type, isEdit]);

  // Auto-select first available split position on create
  useEffect(() => {
    if (isEdit || formData.banner_type !== BannerType.SPLIT || formData.position) return;
    if (!occupiedSplitPositions.has(BannerPosition.LEFT)) {
      setFormData((prev) => ({ ...prev, position: BannerPosition.LEFT }));
    } else if (!occupiedSplitPositions.has(BannerPosition.RIGHT)) {
      setFormData((prev) => ({ ...prev, position: BannerPosition.RIGHT }));
    }
  }, [occupiedSplitPositions, formData.banner_type, isEdit]);

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
      store_id: user?.store_id || undefined,
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
    <div className="space-y-6">
      {/* Page Header — matches ProductForm/OrderForm */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/banners")}
            className="w-9 h-9 border-slate-200 text-slate-500 hover:text-slate-900 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isEdit ? "Edit Banner" : "Create Banner"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEdit ? "Update banner details and settings" : "Add promotional banners to your storefront"}
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

      <form onSubmit={handleSubmit}>
        {/* ═══ Two-column layout ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN (2/3) ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Banner Type Selection */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Banner Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Hero */}
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.banner_type === BannerType.HERO
                      ? 'border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/20'
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
                        className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-900"
                      />
                      <span className="font-semibold text-slate-900">Hero</span>
                    </div>
                    {!isEdit && (
                      <span className="text-xs font-medium text-slate-500">
                        {BANNER_TYPE_LIMITS[BannerType.HERO] - (remainingSlots?.hero ?? 10)}/{BANNER_TYPE_LIMITS[BannerType.HERO]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">Large carousel banners (max 10)</p>
                  {!isEdit && remainingSlots?.hero === 0 && (
                    <p className="text-xs text-red-600 mt-2">Limit reached</p>
                  )}
                </div>

                {/* Editorial */}
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.banner_type === BannerType.EDITORIAL
                      ? 'border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/20'
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
                        className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-900"
                      />
                      <span className="font-semibold text-slate-900">Editorial</span>
                    </div>
                    {!isEdit && (
                      <span className="text-xs font-medium text-slate-500">
                        {BANNER_TYPE_LIMITS[BannerType.EDITORIAL] - (remainingSlots?.editorial ?? 1)}/{BANNER_TYPE_LIMITS[BannerType.EDITORIAL]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">Featured content banners (max 1)</p>
                  {!isEdit && remainingSlots?.editorial === 0 && (
                    <p className="text-xs text-red-600 mt-2">Limit reached</p>
                  )}
                </div>

                {/* Split */}
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.banner_type === BannerType.SPLIT
                      ? 'border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/20'
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
                        className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-900"
                      />
                      <span className="font-semibold text-slate-900">Split</span>
                    </div>
                    {!isEdit && (
                      <span className="text-xs font-medium text-slate-500">
                        {BANNER_TYPE_LIMITS[BannerType.SPLIT] - (remainingSlots?.split ?? 2)}/{BANNER_TYPE_LIMITS[BannerType.SPLIT]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">Side-by-side promo banners (max 2)</p>
                  {!isEdit && remainingSlots?.split === 0 && (
                    <p className="text-xs text-red-600 mt-2">Limit reached</p>
                  )}
                </div>
              </div>
            </div>

            {/* Visual Slot Picker (Hero) */}
            {formData.banner_type === BannerType.HERO && (
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Carousel Position <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-xs text-slate-500">Click an available slot</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((slot) => {
                    const slotStr = String(slot);
                    const occupant = occupiedHeroSlots.get(slotStr);
                    const isOccupied = !!occupant;
                    const isSelected = formData.position === slotStr;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setFormData({ ...formData, position: slotStr })}
                        className={`relative flex flex-col items-center justify-center rounded-lg border-2 transition-all h-20 ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/20'
                            : isOccupied
                              ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                              : 'border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        {isOccupied && occupant?.web_image_url ? (
                          <img
                            src={occupant.web_image_url}
                            alt={occupant.title || `Slot ${slot}`}
                            className="absolute inset-0 w-full h-full object-cover rounded-[6px]"
                          />
                        ) : null}
                        {/* Contrast backdrop for text over images */}
                        {isOccupied && occupant?.web_image_url && (
                          <span className="absolute inset-0 bg-black/50 rounded-[6px]" />
                        )}
                        <span className={`text-sm font-bold relative z-10 ${
                          isSelected ? 'text-slate-900' : isOccupied ? 'text-white' : 'text-slate-500'
                        }`}>
                          {slot}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                        <span className={`text-[9px] font-medium relative z-10 mt-0.5 ${
                          isSelected ? 'text-slate-700' : isOccupied ? 'text-white/80' : 'text-slate-400'
                        }`}>
                          {isSelected ? 'Selected' : isOccupied ? (occupant?.title ? occupant.title.slice(0, 8) : 'Taken') : 'Available'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {formData.banner_type === BannerType.SPLIT && (
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Position <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-xs text-slate-500">Select a side</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[BannerPosition.LEFT, BannerPosition.RIGHT].map((side) => {
                    const occupant = occupiedSplitPositions.get(side);
                    const isOccupied = !!occupant;
                    const isSelected = formData.position === side;
                    const label = side === BannerPosition.LEFT ? 'Left' : 'Right';

                    return (
                      <button
                        key={side}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setFormData({ ...formData, position: side })}
                        className={`relative flex flex-col items-center justify-center rounded-lg border-2 transition-all h-24 overflow-hidden ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/20'
                            : isOccupied
                              ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                              : 'border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        {isOccupied && occupant?.web_image_url && (
                          <>
                            <img
                              src={occupant.web_image_url}
                              alt={occupant.title || `${label} banner`}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <span className="absolute inset-0 bg-black/50 rounded-[6px]" />
                          </>
                        )}
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center z-10">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                        <span className={`text-sm font-bold relative z-10 ${
                          isSelected ? 'text-slate-900' : isOccupied ? 'text-white' : 'text-slate-600'
                        }`}>
                          {label}
                        </span>
                        <span className={`text-[10px] font-medium relative z-10 mt-0.5 ${
                          isSelected ? 'text-slate-600' : isOccupied ? 'text-white/80' : 'text-slate-400'
                        }`}>
                          {isSelected ? 'Selected' : isOccupied ? (occupant?.title ? occupant.title.slice(0, 12) : 'Taken') : 'Available'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}



            {/* Banner Content */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Content</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Summer Collection Sale"
                    className="h-11 border-slate-200 focus:border-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Subtitle</label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="e.g., Up to 50% off"
                    className="h-11 border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the banner (optional)"
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Call to Action</label>
                <Input
                  value={formData.call_to_action}
                  onChange={(e) => setFormData({ ...formData, call_to_action: e.target.value })}
                  placeholder="e.g., Shop Now"
                  className="h-11 border-slate-200 focus:border-slate-900"
                />
              </div>
            </div>


          </div>

          {/* ── RIGHT COLUMN (1/3) ───────────────────────────────────── */}
          <div className="space-y-6">

            {/* Status Toggle — custom toggle matching OrderForm */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Active Listing</p>
                  <p className="text-xs text-slate-500 mt-0.5">Visible on storefront</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-[18px] bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-900/20 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                  <div className={`absolute left-0.5 top-[1px] w-4 h-4 bg-white rounded-full transition-transform ${formData.is_active ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                </label>
              </div>
            </div>

            {/* Banner Image — moved to sidebar for column balance */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Banner Image</h3>
              <FileUpload
                label="Upload banner image *"
                accept="image/*"
                multiple={false}
                maxSize={5 * 1024 * 1024}
                folder="banners"
                value={formData.web_image_url ? [formData.web_image_url] : []}
                onChange={(urls) =>
                  setFormData((prev) => ({ ...prev, web_image_url: urls[0] || "" }))
                }
                helperText="Drag & drop or click to upload (max 5MB, recommended: 1920×600px)"
              />
            </div>

            {/* Schedule */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Start Date</label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="h-9 border-slate-200 focus:border-slate-900 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">End Date</label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="h-9 border-slate-200 focus:border-slate-900 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">Leave empty for always-on display</p>
            </div>

            {/* Redirect Settings — moved to sidebar */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Redirect Settings</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Redirect Type</label>
                <select
                  value={formData.redirect_type}
                  onChange={(e) => setFormData({ ...formData, redirect_type: e.target.value as any, redirect_target_id: '', redirect_url: '' })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                >
                  <option value="none">None</option>
                  <option value="category">Category</option>
                  <option value="subcategory">Subcategory</option>
                  <option value="subvariant">Subvariant</option>
                  <option value="product">Product</option>
                  <option value="url">URL</option>
                </select>
              </div>

              {formData.redirect_type === 'category' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Select Category</label>
                  <select
                    value={formData.redirect_target_id || ''}
                    onChange={(e) => setFormData({ ...formData, redirect_target_id: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                  >
                    <option value="">Select a category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.redirect_type === 'product' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Select Product</label>
                  <select
                    value={formData.redirect_target_id || ''}
                    onChange={(e) => setFormData({ ...formData, redirect_target_id: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                  >
                    <option value="">Select a product</option>
                    {products?.map((prod: any) => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.redirect_type === 'url' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Redirect URL</label>
                  <Input
                    value={formData.redirect_url}
                    onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                    placeholder="https://example.com"
                    className="h-9 border-slate-200 focus:border-slate-900 text-sm"
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ═══ Sticky Action Bar ═══ */}
        <div className="sticky bottom-0 z-10 -mx-8 px-8 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200 mt-6">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/banners")}
              className="h-10 border-slate-200 text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 px-6 bg-slate-900 text-white hover:bg-slate-800 font-semibold"
            >
              {isLoading
                ? (isEdit ? "Saving..." : "Creating...")
                : (isEdit ? "Save Changes" : "Create Banner")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
