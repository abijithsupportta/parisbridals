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

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Name must be less than 100 characters'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  subvariant_id: z.string().optional(),
  description: z.string().optional(),
  price_per_day: z.number().min(0, 'Price must be positive'),
  security_deposit: z.number().min(0, 'Security deposit must be positive'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  available_quantity: z.number().min(0, 'Available quantity must be positive'),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  track_inventory: z.boolean(),
  low_stock_threshold: z.number().min(0, 'Threshold must be positive'),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional(), is_primary: z.boolean().optional(), sort_order: z.number().optional() })).optional(),
}).refine((data) => data.available_quantity <= data.quantity, {
  message: 'Available quantity cannot be greater than total quantity',
  path: ['available_quantity'],
});

type ProductFormData = z.infer<typeof productFormSchema>;

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
      images: product?.images || [],
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
      available_quantity: product?.available_quantity || 0,
      is_active: product?.is_active ?? true,
      is_featured: product?.is_featured ?? false,
      track_inventory: product?.track_inventory ?? true,
      low_stock_threshold: product?.low_stock_threshold ?? 10,
    },
  });

  const watchedImages = form.watch('images');

  // Auto-generate slug from name
  const watchName = form.watch('name');
  useEffect(() => {
    if (watchName && !product && !form.getValues('slug')) {
      const slug = generateSlug(watchName);
      form.setValue('slug', slug);
    }
  }, [watchName, form, product]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file types and sizes
    const validFiles = Array.from(files).filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        showError('Invalid File', `${file.name} is not a valid image file`);
        return false;
      }
      
      if (!isValidSize) {
        showError('File Too Large', `${file.name} exceeds 5MB size limit`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    setIsUploadingImages(true);
    try {
      const uploadResult = await uploadImages(validFiles);
      if (uploadResult && uploadResult.success) {
        const uploadData = uploadResult.data || [];
        const currentImages = form.getValues('images') || [];
        const newImages = uploadData
          .filter((item: any) => item.result && item.result.url)
          .map((item: any, index: number) => ({ 
            url: item.result.url, 
            alt: `Image ${currentImages.length + index + 1}`, 
            is_primary: currentImages.length === 0 && index === 0, // First image is primary
            sort_order: currentImages.length + index 
          }));
        form.setValue('images', [...currentImages, ...newImages]);
        showSuccess('Images Uploaded', `${newImages.length} image(s) uploaded successfully`);
      } else {
        showError('Upload Failed', uploadResult?.error?.message || 'Failed to upload images');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showError('Upload Error', 'An unexpected error occurred while uploading images');
    } finally {
      setIsUploadingImages(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues('images') || [];
    form.setValue('images', currentImages.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Validate required fields
      if (!data.name?.trim()) {
        showError('Validation Error', 'Product name is required');
        return;
      }
      
      if (!data.slug?.trim()) {
        showError('Validation Error', 'Product slug is required');
        return;
      }

      if (data.price_per_day <= 0) {
        showError('Validation Error', 'Price per day must be greater than 0');
        return;
      }

      if (data.quantity < 0) {
        showError('Validation Error', 'Quantity cannot be negative');
        return;
      }

      if (data.available_quantity < 0) {
        showError('Validation Error', 'Available quantity cannot be negative');
        return;
      }

      if (data.available_quantity > data.quantity) {
        showError('Validation Error', 'Available quantity cannot be greater than total quantity');
        return;
      }

      // Transform images to ensure all required fields are present
      const transformedImages = (data.images || []).map((image, index) => ({
        ...image,
        sort_order: image.sort_order ?? index,
        is_primary: image.is_primary ?? false,
      }));

      const productData: CreateProductDTO | UpdateProductDTO = {
        ...data,
        images: transformedImages,
        store_id: 'default-store-id', // TODO: Get from user context
      };

      if (isEditing && product) {
        try {
          const result = await updateProduct.mutateAsync({ id: product.id, data: productData });
          if (!result.success) {
            showError('Update Failed', result.error?.message || 'Failed to update product');
            return;
          }
          showSuccess('Product Updated', 'Product has been updated successfully');
        } catch (error) {
          showError('Update Failed', 'An unexpected error occurred');
          return;
        }
      } else {
        try {
          const result = await createProduct.mutateAsync(productData as CreateProductDTO);
          if (!result.success) {
            showError('Creation Failed', result.error?.message || 'Failed to create product');
            return;
          }
          showSuccess('Product Created', 'Product has been created successfully');
        } catch (error) {
          showError('Creation Failed', 'An unexpected error occurred');
          return;
        }
      }

      onSuccess?.();
      closeCreateModal();
      closeEditModal();
      form.reset();
    } catch (error) {
      console.error('Product form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      showError('Failed to save product', errorMessage);
    }
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-800">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Product Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter product name" 
                          {...field}
                          className="border-slate-200 focus:border-primary focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Slug *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="product-slug" 
                          {...field}
                          className="border-slate-200 focus:border-primary focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              </CardContent>
          </Card>

          {/* Product Identifiers */}
          <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-800">Product Identifiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">SKU</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="SKU-001" 
                          {...field}
                          className="border-slate-200 focus:border-primary focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Barcode</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Auto-generated or manual" 
                            {...field} 
                            className="flex-1 border-slate-200 focus:border-primary focus:ring-primary/20"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newBarcode = generateBarcodeNumber();
                              field.onChange(newBarcode);
                            }}
                            className="px-3 hover:bg-primary/10 border-slate-200"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const productName = form.getValues('name') || 'Product';
                                downloadBarcode(field.value!, productName);
                              }}
                              className="px-3 hover:bg-primary/10 border-slate-200"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-700">Product Categories</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">Main Category *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Clear subcategory and subvariant when category changes
                        form.setValue('subcategory_id', '');
                        form.setValue('subvariant_id', '');
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-slate-200 focus:border-primary focus:ring-primary/20">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.filter(cat => !cat.parent_id).map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                    )}
                  />

                <FormField
                  control={form.control}
                  name="subcategory_id"
                  render={({ field }) => {
                    const selectedCategoryId = form.watch('category_id');
                    const subcategories = categories.filter(cat => cat.parent_id === selectedCategoryId);
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700">Subcategory</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Clear subvariant when subcategory changes
                            form.setValue('subvariant_id', '');
                          }} 
                          defaultValue={field.value}
                          disabled={!selectedCategoryId}
                        >
                          <FormControl>
                            <SelectTrigger className="border-slate-200 focus:border-primary focus:ring-primary/20 disabled:opacity-50">
                              <SelectValue placeholder="Select a subcategory" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subcategories.map((subcategory) => (
                              <SelectItem key={subcategory.id} value={subcategory.id}>
                                {subcategory.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="subvariant_id"
                  render={({ field }) => {
                    const selectedSubcategoryId = form.watch('subcategory_id');
                    const subvariants = categories.filter(cat => cat.parent_id === selectedSubcategoryId);
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700">Subvariant</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={!selectedSubcategoryId}
                        >
                          <FormControl>
                            <SelectTrigger className="border-slate-200 focus:border-primary focus:ring-primary/20 disabled:opacity-50">
                              <SelectValue placeholder="Select a subvariant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subvariants.map((subvariant) => (
                              <SelectItem key={subvariant.id} value={subvariant.id}>
                                {subvariant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter product description" 
                        className="min-h-[100px] border-slate-200 focus:border-primary focus:ring-primary/20 resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price_per_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Day (₹) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="security_deposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Quantity *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="available_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Quantity *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="low_stock_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Threshold</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="5"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="track_inventory"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Track Inventory</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload product images
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImages}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB each
                    </p>
                  </div>
                </div>
              </div>

              {isUploadingImages && (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Uploading images... {progress}%</span>
                </div>
              )}

              {watchedImages && watchedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {watchedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={image.alt || `Product image ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    {image.is_primary && (
                      <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-br-lg">
                        Primary
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Featured</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploadingImages}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
