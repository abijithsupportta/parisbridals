/**
 * Domain Layer Index
 *
 * Central export point for the entire domain layer.
 *
 * @module domain/index
 */

// Types
export * from './types';

// Schemas - avoid re-exporting conflicting names
export {
  ProductImageSchema,
  CreateProductImageSchema,
  ProductVariantSchema,
  CreateProductVariantSchema,
  ClientCreateProductSchema,
  CreateProductSchema,
  UpdateProductSchema,
  ProductSearchSchema,
  BulkProductOperationSchema,
  ProductImportSchema,
  validateProductSlug,
  generateProductSlug,
  validateProductPricing,
  validateProductInventory,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CustomerSearchSchema,
  CreateOrderSchema,
  UpdateOrderSchema,
  ReturnOrderSchema,
} from './schemas';

export type {
  ClientCreateProductInput,
  CreateProductInput,
  UpdateProductInput,
  BulkProductOperationInput,
  ProductImportInput,
} from './schemas';
