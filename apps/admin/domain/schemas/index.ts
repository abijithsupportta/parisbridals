/**
 * Domain Schemas Index
 *
 * Central export point for all domain validation schemas.
 *
 * @module domain/schemas/index
 */

// Product schemas
export {
  ProductImageSchema,
  CreateProductImageSchema,
  ProductVariantSchema,
  CreateProductVariantSchema,
  CreateProductSchema,
  UpdateProductSchema,
  ProductSearchSchema,
  BulkProductOperationSchema,
  ProductImportSchema,
  validateProductSlug,
  generateProductSlug,
  validateProductPricing,
  validateProductInventory,
} from './product.schema';

export type {
  CreateProductInput,
  UpdateProductInput,
  ProductSearchParams,
  BulkProductOperationInput,
  ProductImportInput,
} from './product.schema';

// Common schemas
export {
  UuidSchema,
  NonEmptyStringSchema,
  OptionalStringSchema,
  PositiveNumberSchema,
  EmailSchema,
  PhoneSchema,
  PaginationSchema,
  SortSchema,
  SearchSchema,
  FileUploadSchema,
  AddressSchema,
  ContactInfoSchema,
  MoneySchema,
  DateRangeSchema,
  CreateUserSchema,
  UpdateUserSchema,
  CreateStoreSchema,
  UpdateStoreSchema,
  CreateOrderSchema,
  UpdateOrderSchema,
  ApiResponseSchema,
  PaginatedResponseSchema,
  validateSlug,
  generateSlug,
  validateUuid,
} from './common.schema';

export type {
  PaginationInput,
  SortInput,
  SearchInput,
  FileUploadInput,
  AddressInput,
  ContactInfoInput,
  MoneyInput,
  DateRangeInput,
  CreateUserInput,
  UpdateUserInput,
  CreateStoreInput,
  UpdateStoreInput,
  CreateOrderInput,
  UpdateOrderInput,
} from './common.schema';

// Customer schemas
export {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CustomerSearchSchema,
} from './customer.schema';

export type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from './customer.schema';

// Branch inventory schemas
export {
  CreateBranchInventorySchema,
  UpdateBranchInventorySchema,
  InventoryAdjustmentSchema,
} from './branch-inventory.schema';

export type {
  CreateBranchInventoryInput,
  UpdateBranchInventoryInput,
  InventoryAdjustmentInput,
} from './branch-inventory.schema';
