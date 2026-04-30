/**
 * Hooks Layer Index
 *
 * Central export point for all custom React hooks.
 *
 * @module hooks/index
 */

// Product hooks
export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCanDeleteProduct,
  useBulkProductOperation,
  useProductForm,
  useProductSelection,
  useLookupProductByBarcode,
} from './useProducts';

// Category hooks
export {
  useCategories,
  useCategory,
  useCategoryChildren,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCanDeleteCategory,
  useCategorySearch,
  useCategoryTree,
} from './useCategories';

// Upload hooks
export {
  useUploadFile,
  useUploadMultipleFiles,
  useUploadProductImages,
  useUploadCategoryImage,
  useDeleteFile,
  useFileInfo,
  useGenerateImageVariants,
  useOptimizeImage,
  useFileValidation,
  useImageUploadWithPreview,
  useImageDimensions,
} from './useUpload';

// Branch hooks
export {
  useBranches,
  useSimpleBranches,
  useBranch,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
} from './useBranches';

// Staff hooks
export {
  useStaff,
  useStaffByBranch,
  useStaffMember,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useToggleStaffStatus,
} from './useStaff';

// Permission hooks
export { usePermissions } from './usePermissions';

// Banner hooks
export {
  useBanners,
  useBanner,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
  useReorderBanners,
  useBannerCounts,
  useRemainingSlots,
} from './useBanners';

// Customer hooks
export {
  useCustomers,
  useCustomer,
  useCustomerByPhone,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from './useCustomers';

// Order hooks
export {
  useOrders,
  useOrder,
  useOrderStatusHistory,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useProcessOrderReturn,
  useMarkDepositReturned,
} from './useOrders';

// Settings hooks
export {
  useGSTPercentage,
  useUpdateGSTPercentage,
  useIsGSTEnabled,
  useUpdateIsGSTEnabled,
  useInvoicePrefix,
  usePaymentTerms,
  useAuthorizedSignature,
  useUpdateSetting,
} from './useSettings';

// Payment hooks
export {
  usePayments,
  usePayment,
  useOrderPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
} from './usePayments';

// Product Availability hooks (Interval-Based Scheduling)
export {
  useProductAvailabilityCalendar,
  useCheckOrderAvailability,
} from './useProductAvailability';

// Calendar hooks
export {
  useCalendarOrders,
  useCalendarView,
  useCalendarNavigation,
} from './useCalendar';
