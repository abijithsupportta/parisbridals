/**
 * Enhanced Product Form Component
 *
 * Modern product creation/editing form using the new architecture.
 * Integrates with TanStack Query, Zustand, and the service layer.
 *
 * @module components/admin/products/ProductForm
 */

"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useCreateProduct, useUpdateProduct, useCategories, useUploadProductImages } from '@/hooks';
import { useProductStore, useAppStore } from '@/stores';
import { Product, CreateProductDTO, UpdateProductDTO } from '@/domain';
import { CreateProductSchema, UpdateProductSchema } from '@/domain';
import { formatCurrency, generateSlug } from '@/lib/shared-utils';
import { generateBarcodeNumber, validateBarcode, downloadBarcode } from '@/lib/barcode';
import { Loader2, Upload, X, ImageIcon, AlertCircle, RefreshCw, Download } from 'lucide-react';

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001';

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  subvariant_id: z.string().optional(),
  description: z.string().optional(),
  price_per_day: z.number().min(0, 'Rent amount must be positive'),
  security_deposit: z.number().optional(),
  quantity: z.number().min(0, 'Quantity must be positive'),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  track_inventory: z.boolean(),
  low_stock_threshold: z.number().min(0),
  images: z.array(z.object({
    url: z.string(),
    alt_text: z.string().optional(),
    is_primary: z.boolean().optional(),
    sort_order: z.number().optional(),
  })).optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

/** Normalize images from DB (may be raw URL strings or JSONB objects) */
function normalizeImages(imgs: any): ProductFormData['images'] {
  if (!imgs || !Array.isArray(imgs)) return [];
  return imgs.map((img: any, i: number) => {
    if (typeof img === 'string') return { url: img, alt_text: '', is_primary: i === 0, sort_order: i };
    return { url: img.url || '', alt_text: img.alt_text || img.alt || '', is_primary: img.is_primary ?? i === 0, sort_order: img.sort_order ?? i };
  });
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEditing = !!product;
  const { showSuccess, showError } = useAppStore();
  const { closeCreateModal, closeEditModal } = useProductStore();
  const { categories } = useCategories();
  const { uploadImages, isLoading: isUploading, progress } = useUploadProductImages();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      images: normalizeImages(product?.images),
      name: product?.name || '',
      slug: product?.slug || '',
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      category_id: product?.category_id || '',
      subcategory_id: product?.subcategory_id || '',
      subvariant_id: product?.subvariant_id || '',
      description: product?.description || '',
      price_per_day: product?.price_per_day || 0,
      security_deposit: product?.security_deposit || 0,
      quantity: product?.quantity || 0,
      is_active: product?.is_active ?? true,
      is_featured: product?.is_featured ?? false,
      track_inventory: product?.track_inventory ?? true,
      low_stock_threshold: product?.low_stock_threshold ?? 10,
    },
  });

  const watchedImages = form.watch('images');

  // Handle name change: auto-generate slug in real-time (create mode only)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (v: string) => void) => {
    const val = e.target.value;
    fieldOnChange(val);
    if (!isEditing) {
      form.setValue('slug', generateSlug(val), { shouldValidate: false });
    }
  };

  // ── Image Handling ──────────────────────────────────────────────────
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) { showError('Invalid File', `${file.name} is not an image`); return false; }
      if (file.size > 5 * 1024 * 1024) { showError('File Too Large', `${file.name} exceeds 5 MB`); return false; }
      return true;
    });
    if (validFiles.length === 0) return;

    setIsUploadingImages(true);
    try {
      const uploadResult = await uploadImages(validFiles);
      if (uploadResult?.success) {
        const current = form.getValues('images') || [];
        const newImgs = (uploadResult.data || [])
          .filter((item: any) => item.result?.url)
          .map((item: any, idx: number) => ({
            url: item.result.url,
            alt_text: '',
            is_primary: current.length === 0 && idx === 0,
            sort_order: current.length + idx,
          }));
        form.setValue('images', [...current, ...newImgs]);
        showSuccess('Uploaded', `${newImgs.length} image(s) uploaded`);
      } else {
        showError('Upload Failed', uploadResult?.error?.message || 'Upload failed');
      }
    } catch { showError('Upload Error', 'Unexpected error'); }
    finally { setIsUploadingImages(false); event.target.value = ''; }
  };

  const removeImage = (index: number) => {
    const imgs = form.getValues('images') || [];
    form.setValue('images', imgs.filter((_, i) => i !== index));
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const onSubmit = async (data: ProductFormData) => {
    try {
      const transformedImages = (data.images || []).map((img, i) => ({
        url: img.url,
        alt_text: img.alt_text ?? '',
        is_primary: img.is_primary ?? i === 0,
        sort_order: img.sort_order ?? i,
      }));

      // Clean up fields for Supabase + Zod compatibility:
      // - UUID columns: empty string → null (Supabase rejects '' for UUID)
      // - String columns: empty string → undefined (Zod rejects null for optional strings)
      const payload: any = {
        ...data,
        images: transformedImages,
        store_id: DEFAULT_STORE_ID,
        category_id: data.category_id || null,
        subcategory_id: data.subcategory_id || null,
        subvariant_id: data.subvariant_id || null,
        security_deposit: data.security_deposit ?? 0,
        available_quantity: data.quantity, // auto-set available = total on create/edit
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        description: data.description || undefined,
      };

      if (isEditing && product) {
        const result = await updateProduct.mutateAsync({ id: product.id, data: payload });
        if (!result.success) { showError('Update Failed', result.error?.message || 'Failed'); return; }
        showSuccess('Updated', 'Product updated successfully');
      } else {
        const result = await createProduct.mutateAsync(payload as CreateProductDTO);
        if (!result.success) { showError('Creation Failed', result.error?.message || 'Failed'); return; }
        showSuccess('Created', 'Product created successfully');
      }

      onSuccess?.();
      closeCreateModal();
      closeEditModal();
      form.reset();
    } catch (error) {
      showError('Error', error instanceof Error ? error.message : 'Unexpected error');
    }
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Sticky Action Bar */}
          <div className="sticky top-0 z-10 -mx-6 -mt-1 px-6 py-3 mb-6 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">{isEditing ? 'Edit Product' : 'New Product'}</p>
              <p className="text-xs text-slate-400">{isEditing ? 'Update details below' : 'Fill in the details'}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isLoading || isUploadingImages} className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 px-6">
                {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {isEditing ? 'Update' : 'Create Product'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ─── LEFT COLUMN ─── */}
            <div className="xl:col-span-2 space-y-5">

              {/* Basic Info */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] flex items-center justify-center font-bold">1</span>
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Product Name *</FormLabel>
                        <FormControl><Input placeholder="e.g. Diamond Necklace Set" {...field} onChange={(e) => handleNameChange(e, field.onChange)} className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="slug" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">URL Slug *</FormLabel>
                        <FormControl><Input placeholder="diamond-necklace-set" {...field} className="h-10 font-mono text-sm" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</FormLabel>
                      <FormControl><Textarea placeholder="Materials, occasion, style..." className="min-h-[90px] resize-none text-sm" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Identifiers */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center font-bold">2</span>
                    Identifiers
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="sku" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</FormLabel>
                        <FormControl><Input placeholder="PB-NK-001" {...field} className="h-10 font-mono text-sm" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="barcode" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Barcode</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input placeholder="Auto-generated" {...field} className="flex-1 h-10 font-mono text-sm" />
                            <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => field.onChange(generateBarcodeNumber())}><RefreshCw className="w-3.5 h-3.5" /></Button>
                            {field.value && <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => downloadBarcode(field.value!, form.getValues('name') || 'Product')}><Download className="w-3.5 h-3.5" /></Button>}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              {/* Categories — Cascading Selects */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] flex items-center justify-center font-bold">3</span>
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Main Category */}
                    <FormField control={form.control} name="category_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Main Category</FormLabel>
                        <Select
                          value={field.value || ''}
                          onValueChange={(v) => { field.onChange(v); form.setValue('subcategory_id', ''); form.setValue('subvariant_id', ''); }}
                        >
                          <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {categories.filter(c => !c.parent_id).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Subcategory */}
                    <FormField control={form.control} name="subcategory_id" render={({ field }) => {
                      const catId = form.watch('category_id');
                      const subs = categories.filter(c => c.parent_id === catId);
                      return (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subcategory</FormLabel>
                          <Select
                            key={`sub-${catId}`}
                            value={field.value || ''}
                            onValueChange={(v) => { field.onChange(v); form.setValue('subvariant_id', ''); }}
                            disabled={!catId || subs.length === 0}
                          >
                            <FormControl><SelectTrigger className="h-10 disabled:opacity-50"><SelectValue placeholder={!catId ? '← Pick category' : subs.length === 0 ? 'None available' : 'Select'} /></SelectTrigger></FormControl>
                            <SelectContent>
                              {subs.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }} />

                    {/* Variant */}
                    <FormField control={form.control} name="subvariant_id" render={({ field }) => {
                      const subId = form.watch('subcategory_id');
                      const vars = categories.filter(c => c.parent_id === subId);
                      return (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Variant</FormLabel>
                          <Select
                            key={`var-${subId}`}
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            disabled={!subId || vars.length === 0}
                          >
                            <FormControl><SelectTrigger className="h-10 disabled:opacity-50"><SelectValue placeholder={!subId ? '← Pick sub' : vars.length === 0 ? 'None available' : 'Select'} /></SelectTrigger></FormControl>
                            <SelectContent>
                              {vars.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }} />
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-[10px] flex items-center justify-center font-bold">4</span>
                    Product Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <label htmlFor="img-upload" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isUploadingImages ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/40'}`}>
                    {isUploadingImages ? (
                      <div className="text-center"><Loader2 className="mx-auto h-7 w-7 text-violet-400 animate-spin mb-1" /><p className="text-sm text-violet-600 font-medium">Uploading… {progress}%</p></div>
                    ) : (
                      <div className="text-center"><Upload className="mx-auto h-7 w-7 text-slate-300 mb-1" /><p className="text-sm text-slate-500">Drop images or <span className="text-violet-600 font-medium">browse</span></p><p className="text-xs text-slate-400 mt-0.5">PNG, JPG up to 5 MB</p></div>
                    )}
                    <input id="img-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageUpload} disabled={isUploadingImages} />
                  </label>
                  {watchedImages && watchedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {watchedImages.map((img, i) => (
                        <div key={i} className="relative group aspect-square">
                          <img src={img.url} alt={img.alt_text || ''} className="w-full h-full object-cover rounded-xl border" />
                          {img.is_primary && <span className="absolute top-1 left-1 bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Primary</span>}
                          <button type="button" onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all shadow"><X className="w-2.5 h-2.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── RIGHT COLUMN ─── */}
            <div className="space-y-5">
              {/* Pricing */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50"><CardTitle className="text-sm font-semibold text-slate-700">Pricing</CardTitle></CardHeader>
                <CardContent className="pt-4">
                  <FormField control={form.control} name="price_per_day" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rent Amount (₹) *</FormLabel>
                      <FormControl>
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="pl-7 h-10" /></div>
                      </FormControl><FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Inventory */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50"><CardTitle className="text-sm font-semibold text-slate-700">Inventory</CardTitle></CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Qty *</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-10" /></FormControl><FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="low_stock_threshold" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Stock Alert</FormLabel>
                      <FormControl><Input type="number" placeholder="5" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-10" /></FormControl><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="track_inventory" render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <FormLabel className="text-sm text-slate-700 cursor-pointer mb-0">Track Inventory</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Status */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50"><CardTitle className="text-sm font-semibold text-slate-700">Status</CardTitle></CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div><FormLabel className="text-sm text-slate-700 cursor-pointer mb-0">Active</FormLabel><p className="text-xs text-slate-400">Visible to customers</p></div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="is_featured" render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div><FormLabel className="text-sm text-slate-700 cursor-pointer mb-0">Featured</FormLabel><p className="text-xs text-slate-400">Shown on homepage</p></div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
