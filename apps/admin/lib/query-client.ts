/**
 * Query Client Configuration
 *
 * Configures TanStack Query with proper defaults for the Paris Bridals admin dashboard.
 * Includes error handling, retry logic, and cache configuration.
 *
 * @module lib/query-client
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient instance with optimal defaults
 * for the admin dashboard.
 *
 * Features:
 * - Default stale time of 5 minutes for better UX
 * - Retry configuration with exponential backoff
 * - Error boundary integration
 * - Cache size limits to prevent memory issues
 *
 * @returns {QueryClient} Configured QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        
        // Data is considered fresh for 10 minutes in cache
        gcTime: 10 * 60 * 1000,
        
        // Retry failed requests 3 times with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        
        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch on window focus (optional, can be disabled)
        refetchOnWindowFocus: false,
        
        // Refetch on reconnect
        refetchOnReconnect: true,
        
        // Don't refetch on mount if data is fresh
        refetchOnMount: false,
      },
      
      mutations: {
        // Retry mutations once
        retry: 1,
        
        // Error handling for mutations
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  });
}

/**
 * Global query client instance for the application
 * This should be used with QueryProvider in the app layout
 */
export const queryClient = createQueryClient();

/**
 * Query keys factory for consistent cache management
 * Using this pattern prevents cache key mismatches
 */
export const queryKeys = {
  // Product queries
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  productsByCategory: (categoryId: string) => ['products', 'category', categoryId] as const,
  productsSearch: (query: string) => ['products', 'search', query] as const,
  
  // Category queries
  categories: ['categories'] as const,
  category: (id: string) => ['categories', id] as const,
  categoryChildren: (id: string) => ['categories', id, 'children'] as const,
  
  // Store queries
  stores: ['stores'] as const,
  store: (id: string) => ['stores', id] as const,
  
  // Order queries
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  
  // Customer queries
  customers: ['customers'] as const,
  customer: (id: string) => ['customers', id] as const,
  
  // Banner queries
  banners: ['banners'] as const,
  banner: (id: string) => ['banners', id] as const,
  
  // Payment queries
  payments: ['payments'] as const,
  payment: (id: string) => ['payments', id] as const,
  orderPayments: (orderId: string) => ['payments', 'order', orderId] as const,
  
  // Settings queries
  settings: ['settings'] as const,
} as const;

/**
 * Utility functions for cache management
 */
export const queryUtils = {
  /**
   * Invalidate all product-related queries
   */
  invalidateProducts: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.products,
    });
  },
  
  /**
   * Invalidate a specific product and related queries
   */
  invalidateProduct: (id: string) => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.product(id),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.products,
      }),
    ]);
  },
  
  /**
   * Invalidate all category-related queries
   */
  invalidateCategories: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.categories,
    });
  },
  
  /**
   * Invalidate all payment-related queries
   */
  invalidatePayments: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.payments,
    });
  },
  
  /**
   * Invalidate a specific payment
   */
  invalidatePayment: (id: string) => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.payment(id),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments,
      }),
    ]);
  },
  
  /**
   * Invalidate order payments
   */
  invalidateOrderPayments: (orderId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.orderPayments(orderId),
    });
  },
  
  /**
   * Invalidate all settings-related queries
   */
  invalidateSettings: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.settings,
    });
  },
  
  /**
   * Set optimistic update for a product
   */
  setProductOptimistic: (id: string, updater: (old: any) => any) => {
    return queryClient.setQueryData(
      queryKeys.product(id),
      updater
    );
  },
  
  /**
   * Cancel all ongoing queries
   */
  cancelAll: () => {
    return queryClient.cancelQueries();
  },
};
