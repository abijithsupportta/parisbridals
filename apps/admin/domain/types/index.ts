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
  CategoryWithRelations,
  CategoryHierarchy,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryValidationResult,
  CategoryValidationError,
} from './category';

export {
  CategoryLevel,
} from './category';

export {
  isValidCategory,
  isMainCategory,
  isSubCategory,
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
  NotificationType,
} from './common';

export {
  isValidId,
  isValidEmail,
  isValidPhone,
  isValidMoney,
  isValidDateRange,
} from './common';

// Customer types
export type {
  Customer,
  IdType,
  IdDocument,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerSearchParams,
  CustomerSearchResult,
} from './customer';

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

// Banner types
export type {
  Banner,
  CreateBannerDTO,
  UpdateBannerDTO,
  BannerSearchParams,
} from './banner';

export {
  BannerRedirectType,
  BannerType,
  BannerPosition,
  BANNER_TYPE_LIMITS,
  validateBannerPosition,
} from './banner';

// Inventory types
export type {
  ProductInventory,
  ProductInventoryWithBranch,
  CreateProductInventoryDTO,
  UpdateProductInventoryDTO,
  ProductInventorySearchParams,
} from './inventory';

// Branch inventory types
export type {
  BranchInventory,
  CreateBranchInventoryDTO,
  UpdateBranchInventoryDTO,
  BranchInventoryWithRelations,
  InventoryAdjustment,
} from './branch-inventory';

// Order types
export type {
  Order,
  OrderWithRelations,
  OrderItem,
  OrderStatusHistory,
  CreateOrderDTO,
  UpdateOrderDTO,
  ReturnOrderDTO,
  OrderSearchParams,
  OrderValidationResult,
} from './order';

export {
  OrderStatus,
  ConditionRating,
  DeliveryMethod,
} from './order';

// Settings types
export type {
  Setting,
  CreateSettingDTO,
  UpdateSettingDTO,
  SettingValidationResult,
} from './settings';

export {
  SettingKey,
} from './settings';

// Payment types
export type {
  Payment,
  PaymentWithRelations,
  CreatePaymentDTO,
  UpdatePaymentDTO,
  PaymentSearchParams,
} from './payment';

export {
  PaymentType,
  PaymentMode,
} from './payment';

// Calendar types
export type {
  CalendarEvent,
  DaySummary,
  CalendarMonthStats,
} from './calendarTypes';
