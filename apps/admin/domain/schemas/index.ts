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
} from './product.schema';

export type {
  ClientCreateProductInput,
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

// Order schemas
export {
  CreateOrderSchema,
  UpdateOrderSchema,
  ReturnOrderSchema,
} from './order.schema';

// Category schemas
export {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategorySearchSchema,
} from './category.schema';

export type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategorySearchInput,
} from './category.schema';

// Banner schemas
export {
  CreateBannerSchema,
  UpdateBannerSchema,
} from './banner.schema';

export type {
  CreateBannerInput,
  UpdateBannerInput,
} from './banner.schema';

// Staff schemas
export {
  CreateStaffSchema,
  UpdateStaffSchema,
  StaffSearchSchema,
} from './staff.schema';

export type {
  CreateStaffInput,
  UpdateStaffInput,
  StaffSearchInput,
} from './staff.schema';

// Settings schemas
export {
  CreateSettingSchema,
  UpdateSettingSchema,
  GSTPercentageSchema,
} from './settings.schema';

export type {
  CreateSettingInput,
  UpdateSettingInput,
  GSTPercentageInput,
} from './settings.schema';

// Payment schemas
export {
  CreatePaymentSchema,
  UpdatePaymentSchema,
  PaymentSearchSchema,
} from './payment.schema';

export type {
  CreatePaymentInput,
  UpdatePaymentInput,
  PaymentSearchInput,
} from './payment.schema';
