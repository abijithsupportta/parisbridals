/**
 * Product Store - Zustand State Management
 *
 * Global state management for product-related UI state that doesn't
 * belong in server state (TanStack Query cache).
 *
 * @module stores/productStore
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { Product } from '@/domain';

// Re-export domain Product type for store usage
type ProductStoreProduct = Product;

interface ProductFilters {
  search: string;
  category: string;
  status: 'all' | 'active' | 'inactive';
  featured: boolean;
  priceRange: [number, number];
  inStock: boolean;
}

interface ProductUIState {
  // UI State
  selectedProducts: string[];
  filters: ProductFilters;
  viewMode: 'grid' | 'table';
  sortBy: 'name' | 'price' | 'created_at' | 'stock';
  sortOrder: 'asc' | 'desc';
  
  // Form State
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  currentProduct: Product | null;
  
  // Bulk Actions
  isBulkDeleteModalOpen: boolean;
  bulkAction: 'delete' | 'activate' | 'deactivate' | 'feature' | null;
  
  // Loading States
  isExporting: boolean;
  isImporting: boolean;
}

interface ProductStore extends ProductUIState {
  // Actions
  setSelectedProducts: (products: string[]) => void;
  toggleProductSelection: (productId: string) => void;
  selectAll: (productIds: string[]) => void;
  clearSelection: () => void;
  isProductSelected: (id: string) => boolean;
  
  // Filter Actions
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  updateFilter: (key: keyof ProductFilters, value: any) => void;
  
  // View Actions
  setViewMode: (mode: 'grid' | 'table') => void;
  setSorting: (sortBy: 'name' | 'price' | 'created_at' | 'stock', sortOrder: 'asc' | 'desc') => void;
  
  // Modal Actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (product: Product) => void;
  closeEditModal: () => void;
  openDeleteModal: (product: Product) => void;
  closeDeleteModal: () => void;
  
  // Bulk Actions
  openBulkDeleteModal: () => void;
  closeBulkDeleteModal: () => void;
  setBulkAction: (action: 'delete' | 'activate' | 'deactivate' | 'feature' | null) => void;
  
  // Loading Actions
  setExporting: (isExporting: boolean) => void;
  setImporting: (isImporting: boolean) => void;
  
  // Reset
  reset: () => void;
}

// Initial state
const initialState: ProductUIState = {
  selectedProducts: [],
  filters: {
    search: '',
    category: '',
    status: 'all',
    featured: false,
    priceRange: [0, 100000],
    inStock: false,
  },
  viewMode: 'table',
  sortBy: 'created_at',
  sortOrder: 'desc',
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  currentProduct: null,
  isBulkDeleteModalOpen: false,
  bulkAction: null,
  isExporting: false,
  isImporting: false,
};

/**
 * Product store using Zustand with TypeScript support
 * Manages UI state for product management interface
 */
export const useProductStore = create<ProductStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // Selection Actions
      setSelectedProducts: (products) => set({ selectedProducts: products }),
      
      toggleProductSelection: (productId) => {
        const { selectedProducts } = get();
        const isSelected = selectedProducts.includes(productId);
        
        set({
          selectedProducts: isSelected
            ? selectedProducts.filter(id => id !== productId)
            : [...selectedProducts, productId],
        });
      },
      
      selectAll: (productIds) => set({ selectedProducts: productIds }),
      clearSelection: () => set({ selectedProducts: [] }),
      isProductSelected: (id) => {
        const state = get();
        return state.selectedProducts.includes(id);
      },
      
      // Filter Actions
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),
      
      resetFilters: () => set({ filters: initialState.filters }),
      
      updateFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value },
      })),
      
      // View Actions
      setViewMode: (mode) => set({ viewMode: mode }),
      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
      
      // Modal Actions
      openCreateModal: () => set({ 
        isCreateModalOpen: true,
        currentProduct: null,
      }),
      
      closeCreateModal: () => set({ 
        isCreateModalOpen: false,
        currentProduct: null,
      }),
      
      openEditModal: (product) => set({
        isEditModalOpen: true,
        currentProduct: product,
      }),
      
      closeEditModal: () => set({
        isEditModalOpen: false,
        currentProduct: null,
      }),
      
      openDeleteModal: (product) => set({
        isDeleteModalOpen: true,
        currentProduct: product,
      }),
      
      closeDeleteModal: () => set({
        isDeleteModalOpen: false,
        currentProduct: null,
      }),
      
      // Bulk Actions
      openBulkDeleteModal: () => set({ isBulkDeleteModalOpen: true }),
      closeBulkDeleteModal: () => set({ 
        isBulkDeleteModalOpen: false,
        bulkAction: null,
      }),
      
      setBulkAction: (action) => set({ bulkAction: action }),
      
      // Loading Actions
      setExporting: (isExporting) => set({ isExporting }),
      setImporting: (isImporting) => set({ isImporting }),
      
      // Reset
      reset: () => set(initialState),
    })),
    {
      name: 'product-store',
    }
  )
);

// Selectors for optimized re-renders
export const useProductSelectors = {
  // Selection selectors
  selectedProducts: () => useProductStore((state) => state.selectedProducts),
  selectedCount: () => useProductStore((state) => state.selectedProducts.length),
  isProductSelected: (id: string): boolean => 
    useProductStore((state) => state.selectedProducts.includes(id)),
  
  // Filter selectors
  filters: () => useProductStore((state) => state.filters),
  searchQuery: () => useProductStore((state) => state.filters.search),
  activeFiltersCount: () => {
    const filters = useProductStore((state) => state.filters);
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'status' && value === 'all') return false;
      if (key === 'featured' && value === false) return false;
      if (key === 'inStock' && value === false) return false;
      if (key === 'priceRange' && value[0] === 0 && value[1] === 100000) return false;
      return value !== '' && value !== null && value !== undefined;
    }).length;
  },
  
  // View selectors
  viewMode: () => useProductStore((state) => state.viewMode),
  sorting: () => useProductStore((state) => ({ 
    sortBy: state.sortBy, 
    sortOrder: state.sortOrder 
  })),
  
  // Modal selectors
  modals: () => useProductStore((state) => ({
    isCreateModalOpen: state.isCreateModalOpen,
    isEditModalOpen: state.isEditModalOpen,
    isDeleteModalOpen: state.isDeleteModalOpen,
    isBulkDeleteModalOpen: state.isBulkDeleteModalOpen,
    currentProduct: state.currentProduct,
  })),
  
  // Bulk action selectors
  bulkActions: () => useProductStore((state) => ({
    bulkAction: state.bulkAction,
    isBulkDeleteModalOpen: state.isBulkDeleteModalOpen,
  })),
  
  // Loading selectors
  loading: () => useProductStore((state) => ({
    isExporting: state.isExporting,
    isImporting: state.isImporting,
  })),
};

export type { Product, ProductFilters, ProductUIState };
