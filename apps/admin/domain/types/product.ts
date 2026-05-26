/**
 * Product Domain Types
 *
 * Type definitions for the product domain following Domain-Driven Design principles.
 * These types represent the core business entities and value objects.
 *
 * @module domain/types/product
 */

// Core Product Entity
export interface Product {
  readonly id: string;
  readonly store_id: string;
  readonly category_id: string | null;
  readonly subcategory_id: string | null;
  readonly subvariant_id: string | null;
  readonly branch_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price_per_day: number;
  security_deposit: number;
  quantity: number;
  available_quantity: number;
  images: ProductImage[];
  sizes: ProductVariant[];
  colors: ProductVariant[];
  is_active: boolean;
  is_featured: boolean;
  track_inventory: boolean;
  low_stock_threshold: number;
  created_at: string;
  updated_at?: string;
  // Audit fields
  readonly created_by: string | null;
  readonly created_at_branch_id: string | null;
  readonly updated_by: string | null;
  readonly updated_at_branch_id: string | null;
}

// Product Image Value Object
export interface ProductImage {
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

// Product Variant Value Object
export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  additional_price?: number;
  in_stock: boolean;
}

// Product Status Enum
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

// Product Inventory Status
export enum InventoryStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

// Product Create DTO (Data Transfer Object)
export interface CreateProductDTO {
  name: string;
  slug: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  subcategory_id?: string;
  subvariant_id?: string;
  branch_id?: string | 'all';
  store_id?: string;
  description?: string;
  price_per_day: number;
  security_deposit?: number;
  quantity?: number;
  available_quantity?: number;
  images?: Omit<ProductImage, 'id'>[];
  sizes?: Omit<ProductVariant, 'id'>[];
  colors?: Omit<ProductVariant, 'id'>[];
  is_active?: boolean;
  is_featured?: boolean;
  track_inventory?: boolean;
  low_stock_threshold?: number;
  branch_inventory?: Array<{ branch_id: string; quantity: number; id?: string }>;
}

// Product Update DTO
export interface UpdateProductDTO {
  name?: string;
  slug?: string;
  sku?: string;
  barcode?: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  subvariant_id?: string | null;
  description?: string;
  price_per_day?: number;
  security_deposit?: number;
  quantity?: number;
  available_quantity?: number;
  images?: Omit<ProductImage, 'id'>[];
  sizes?: Omit<ProductVariant, 'id'>[];
  colors?: Omit<ProductVariant, 'id'>[];
  is_active?: boolean;
  is_featured?: boolean;
  track_inventory?: boolean;
  low_stock_threshold?: number;
  branch_inventory?: Array<{ branch_id: string; quantity: number; id?: string }>;
  removed_inventory_ids?: string[];
}

// Product Search Parameters
export interface ProductSearchParams {
  query?: string;
  category_id?: string;
  store_id?: string;
  branch_id?: string;
  status?: ProductStatus;
  is_featured?: boolean;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort_by?: 'name' | 'price' | 'created_at' | 'stock';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Product Search Result
export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Product with Related Data
export interface ProductWithRelations extends Product {
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  store?: {
    id: string;
    name: string;
  };
}

// Product Inventory Info
export interface ProductInventory {
  product_id: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  status: InventoryStatus;
  low_stock_threshold: number;
  last_updated: string;
}

// Product Pricing Info
export interface ProductPricing {
  product_id: string;
  price_per_day: number;
  security_deposit: number;
  currency: string;
  discount_percentage?: number;
  valid_from?: string;
  valid_to?: string;
}

// Product Analytics
export interface ProductAnalytics {
  product_id: string;
  views: number;
  orders: number;
  revenue: number;
  average_rating: number;
  total_reviews: number;
  conversion_rate: number;
  period: {
    start: string;
    end: string;
  };
}

// Product Bulk Operations
export interface BulkProductOperation {
  product_ids: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature' | 'update_price';
  data?: Record<string, any>;
}

// Product Bulk Operation Result
export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    product_id: string;
    error: string;
  }>;
  total_processed: number;
  total_successful: number;
  total_failed: number;
}

// Product Import/Export
export interface ProductImportData {
  products: CreateProductDTO[];
  total_count: number;
  valid_count: number;
  invalid_count: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export interface ProductExportData {
  products: Product[];
  export_format: 'csv' | 'xlsx' | 'json';
  filters: ProductSearchParams;
  exported_at: string;
}

// Product Validation Errors
export interface ProductValidationError {
  field: string;
  message: string;
  code: string;
}

// Product Validation Result
export interface ProductValidationResult {
  is_valid: boolean;
  errors: ProductValidationError[];
  warnings: ProductValidationError[];
}

// Domain Events
export interface ProductDomainEvent {
  type: 'product_created' | 'product_updated' | 'product_deleted' | 'product_activated' | 'product_deactivated';
  product_id: string;
  data: Record<string, any>;
  timestamp: string;
  user_id?: string;
}

// Product Aggregate Root (for complex business logic)
export interface ProductAggregate {
  product: Product;
  inventory: ProductInventory;
  pricing: ProductPricing;
  analytics: ProductAnalytics;
  
  // Business logic methods
  canBeDeleted(): boolean;
  isInStock(): boolean;
  isLowStock(): boolean;
  calculateTotalPrice(days: number): number;
  applyDiscount(percentage: number): void;
  reserveStock(quantity: number): boolean;
  releaseStock(quantity: number): void;
}

// Type Guards
export const isValidProduct = (obj: any): obj is Product => {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.store_id === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.slug === 'string' &&
         typeof obj.price_per_day === 'number' &&
         typeof obj.quantity === 'number' &&
         typeof obj.available_quantity === 'number';
};

export const isActiveProduct = (product: Product): boolean => {
  return product.is_active && product.available_quantity > 0;
};

export const isLowStockProduct = (product: Product): boolean => {
  return product.track_inventory && 
         product.available_quantity <= product.low_stock_threshold;
};

export const isOutOfStockProduct = (product: Product): boolean => {
  return product.track_inventory && product.available_quantity === 0;
};
