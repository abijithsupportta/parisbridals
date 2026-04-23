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
  useProductSearch,
  useFeaturedProducts,
  useLowStockProducts,
  useUpdateInventory,
  useCloneProduct,
  useProductForm,
  useProductSelection,
} from './useProducts';

// Category hooks
export {
  useCategories,
  useCategoryHierarchy,
  useCategory,
  useCategoryChildren,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCanDeleteCategory,
  useMoveCategory,
  useReorderCategories,
  useCategoryProductCount,
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
