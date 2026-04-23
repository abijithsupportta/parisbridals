/**
 * Domain Types Index
 *
 * Central export point for all domain types.
 *
 * @module domain/types/index
 */

// Product types
export type {
  Product,
  ProductImage,
  ProductVariant,
  CreateProductDTO,
  UpdateProductDTO,
  ProductSearchParams,
  ProductSearchResult,
  ProductWithRelations,
  ProductInventory,
  ProductPricing,
  ProductAnalytics,
  BulkProductOperation,
  BulkOperationResult,
  ProductImportData,
  ProductExportData,
  ProductValidationError,
  ProductValidationResult,
  ProductDomainEvent,
  ProductAggregate,
} from './product';

export {
  ProductStatus,
  InventoryStatus,
} from './product';

export {
  isValidProduct,
  isActiveProduct,
  isLowStockProduct,
  isOutOfStockProduct,
} from './product';

// Category types
export type {
  Category,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryWithRelations,
  CategoryHierarchy,
  CategoryTreeNode,
  CategoryValidationError,
  CategoryValidationResult,
} from './category';

export {
  CategoryLevel,
} from './category';

export {
  isValidCategory,
  isMainCategory,
  isSubCategory,
  isVariantCategory,
} from './category';

// Common types
export type {
  BaseEntity,
  ApiResponse,
  ApiError,
  PaginatedResponse,
  SearchParams,
  FilterParams,
  FileUpload,
  ImageUploadResult,
  ValidationError,
  ValidationResult,
  Money,
  DateRange,
  Address,
  ContactInfo,
  User,
  Store,
  StoreSettings,
  Order,
  OrderItem,
  Customer,
  Analytics,
  Notification,
  Optional,
  RequiredFields,
  DeepPartial,
} from './common';

export {
  Status,
  SortOrder,
  UserRole,
  Permission,
  OrderStatus,
  NotificationType,
} from './common';

export {
  isValidId,
  isValidEmail,
  isValidPhone,
  isValidMoney,
  isValidDateRange,
} from './common';

// Branch & Staff types
export type {
  Branch,
  BranchWithStaffCount,
  Staff,
  StaffWithBranch,
  StaffRole,
  CreateBranchDTO,
  UpdateBranchDTO,
  CreateStaffDTO,
  UpdateStaffDTO,
  BranchSearchParams,
  StaffSearchParams,
} from './branch';
