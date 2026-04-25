/**
 * Product Validation Schemas
 *
 * Zod schemas for product validation and type safety.
 * Used for API validation, form validation, and data transformation.
 *
 * @module domain/schemas/product.schema
 */

import { z } from 'zod';
import { ProductStatus, InventoryStatus } from '../types/product';

// Base validation schemas
const positiveNumber = z.number().min(0, 'Must be a positive number');
const nonEmptyString = z.string().min(1, 'This field is required');
const optionalString = z.string().optional();
const optionalNumber = z.number().optional();

// Product Image Schema
export const ProductImageSchema = z.object({
  id: z.string(),
  url: z.string().url('Invalid image URL'),
  alt_text: optionalString,
  is_primary: z.boolean(),
  sort_order: z.number().int().min(0),
});

export const CreateProductImageSchema = ProductImageSchema.omit({ id: true });

// Product Variant Schema
export const ProductVariantSchema = z.object({
  id: z.string(),
  name: nonEmptyString,
  value: nonEmptyString,
  additional_price: optionalNumber,
  in_stock: z.boolean(),
});

export const CreateProductVariantSchema = ProductVariantSchema.omit({ id: true });

// ─── Client-Facing Input Schema ─────────────────────────────────────
// This is what the frontend sends. It contains ONLY human-entered fields.
// Server-only fields (store_id, created_by) are deliberately excluded —
// the API route injects them from the authenticated session cookie.
// This separation implements the "Boundary Separation" pattern:
// Client input validation ≠ Database integrity validation.
export const ClientCreateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  sku: z.string().max(50, 'SKU must be less than 50 characters').optional(),
  barcode: z.string().max(50, 'Barcode must be less than 50 characters').optional(),
  category_id: z.string().optional().nullable(),
  subcategory_id: z.string().optional().nullable(),
  subvariant_id: z.string().optional().nullable(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  price_per_day: positiveNumber.max(999999, 'Price must be less than 999,999'),
  security_deposit: z.number().max(999999, 'Security deposit must be less than 999,999').optional().default(0),
  quantity: z.number().int().min(0).optional().default(0),
  available_quantity: z.number().int().min(0, 'Available quantity must be a non-negative integer').optional(),
  images: z.array(CreateProductImageSchema).optional(),
  sizes: z.array(CreateProductVariantSchema).optional(),
  colors: z.array(CreateProductVariantSchema).optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  track_inventory: z.boolean().default(true),
  low_stock_threshold: z.number().int().min(0).default(5),
  branch_inventory: z.array(z.object({
    branch_id: z.string(),
    quantity: z.number().int().min(0),
    id: z.string().optional(),
  })).optional(),
});

// ─── Server-Side Full Schema ────────────────────────────────────────
// Extends the client schema with server-injected fields.
// Used AFTER the API route has merged auth context into the payload.
// This guarantees store_id is always present before hitting the DB.
export const CreateProductSchema = ClientCreateProductSchema.extend({
  store_id: z.string().min(1, 'Store ID is required'),
});

// Product Update Schema
export const UpdateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  sku: z.string().max(50, 'SKU must be less than 50 characters').optional(),
  barcode: z.string().max(50, 'Barcode must be less than 50 characters').optional(),
  category_id: z.string().optional().nullable(),
  subcategory_id: z.string().optional().nullable(),
  subvariant_id: z.string().optional().nullable(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  price_per_day: positiveNumber.max(999999, 'Price must be less than 999,999').optional(),
  security_deposit: z.number().max(999999, 'Security deposit must be less than 999,999').optional(),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer').optional(),
  available_quantity: z.number().int().min(0, 'Available quantity must be a non-negative integer').optional(),
  images: z.array(CreateProductImageSchema).optional(),
  sizes: z.array(CreateProductVariantSchema).optional(),
  colors: z.array(CreateProductVariantSchema).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  track_inventory: z.boolean().optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  branch_inventory: z.array(z.object({
    branch_id: z.string(),
    quantity: z.number().int().min(0),
    id: z.string().optional(),
  })).optional(),
  removed_inventory_ids: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.quantity !== undefined && data.available_quantity !== undefined) {
    return data.available_quantity <= data.quantity;
  }
  return true;
}, {
  message: 'Available quantity cannot be greater than total quantity',
  path: ['available_quantity'],
});

// Product Search Schema
export const ProductSearchSchema = z.object({
  query: z.string().optional(),
  category_id: z.string().optional(),
  store_id: z.string().optional(),
  branch_id: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  is_featured: z.boolean().optional(),
  min_price: positiveNumber.optional(),
  max_price: positiveNumber.optional(),
  in_stock: z.boolean().optional(),
  sort_by: z.enum(['name', 'price', 'created_at', 'stock']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
}).refine((data) => {
  if (data.min_price !== undefined && data.max_price !== undefined) {
    return data.min_price <= data.max_price;
  }
  return true;
}, {
  message: 'Minimum price cannot be greater than maximum price',
  path: ['min_price'],
});

// Bulk Operation Schema
export const BulkProductOperationSchema = z.object({
  product_ids: z.array(z.string()).min(1, 'At least one product must be selected'),
  operation: z.enum(['activate', 'deactivate', 'delete', 'feature', 'unfeature', 'update_price']),
  data: z.record(z.string(), z.any()).optional(),
});

// Product Import Schema
export const ProductImportSchema = z.object({
  products: z.array(CreateProductSchema).min(1, 'At least one product must be provided'),
});

// Validation helpers
export const validateProductSlug = (slug: string): boolean => {
  return /^[a-z0-9-]+$/.test(slug);
};

export const generateProductSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const validateProductPricing = (pricePerDay: number, securityDeposit?: number): boolean => {
  if (pricePerDay <= 0) return false;
  if (securityDeposit !== undefined && securityDeposit < 0) return false;
  return true;
};

export const validateProductInventory = (quantity: number, availableQuantity: number): boolean => {
  return quantity >= 0 && availableQuantity >= 0 && availableQuantity <= quantity;
};

// Type exports
export type ClientCreateProductInput = z.infer<typeof ClientCreateProductSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductSearchParams = z.infer<typeof ProductSearchSchema>;
export type BulkProductOperationInput = z.infer<typeof BulkProductOperationSchema>;
export type ProductImportInput = z.infer<typeof ProductImportSchema>;
