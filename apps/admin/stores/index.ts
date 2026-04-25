/**
 * Stores Index
 *
 * Central export point for all Zustand stores in the application.
 *
 * @module stores/index
 */

export { useProductStore } from './productStore';
export { useAppStore, appUtils } from './appStore';

export type { 
  Product, 
  ProductFilters, 
  ProductUIState 
} from './productStore';

export type { 
  Notification, 
  User, 
  AppUIState 
} from './appStore';
