/**
 * App Store - Zustand State Management
 *
 * Global application state management for UI elements that
 * don't belong in component local state or server cache.
 *
 * @module stores/appStore
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

// Types for app store state
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'staff';
  store_id: string | null;
  branch_id: string | null;
  staff_id: string | null;
}

interface AppUIState {
  // User State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // UI State
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'hi';
  
  // Notifications
  notifications: Notification[];
  
  // Loading States
  globalLoading: boolean;
  
  // Error Handling
  globalError: string | null;
  
  // Navigation
  currentPage: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  
  // Search
  globalSearchOpen: boolean;
  globalSearchQuery: string;

  // Branch Switching — always a specific branch id (no 'all' mode)
  selectedBranchId: string;
}

export interface AppStore extends AppUIState {
  // User Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  
  // UI Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'hi') => void;
  
  // Notification Actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Loading Actions
  setGlobalLoading: (loading: boolean) => void;
  
  // Error Actions
  setGlobalError: (error: string | null) => void;
  
  // Navigation Actions
  setCurrentPage: (page: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; href?: string }>) => void;
  
  // Search Actions
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  setGlobalSearchQuery: (query: string) => void;
  
  // Reset
  reset: () => void;
}

// Initial state
const initialState: AppUIState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  sidebarCollapsed: false,
  theme: 'system',
  language: 'en',
  
  notifications: [],
  
  globalLoading: false,
  globalError: null,
  
  currentPage: '',
  breadcrumbs: [],
  
  globalSearchOpen: false,
  globalSearchQuery: '',

  selectedBranchId: '',
};

/**
 * App store with TypeScript and selectors
 * Manages global application state
 */
export interface AppStore {
  // User State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // UI State
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'hi';
  
  // Notifications
  notifications: Notification[];
  
  // Loading States
  globalLoading: boolean;
  
  // Error Handling
  globalError: string | null;
  
  // Navigation
  currentPage: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  
  // Search
  globalSearchOpen: boolean;
  globalSearchQuery: string;
  
  // User Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  
  // UI Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'hi') => void;
  
  // Notification Actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  
  // Loading Actions
  setGlobalLoading: (loading: boolean) => void;
  
  // Error Actions
  setGlobalError: (error: string | null) => void;
  
  // Navigation Actions
  setCurrentPage: (page: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; href?: string }>) => void;
  
  // Search Actions
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  setGlobalSearchQuery: (query: string) => void;

  // Branch Actions
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
  
  // Reset
  reset: () => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // User Actions
      setUser: (user) => set({ user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setLoading: (isLoading) => set({ isLoading }),
      
      // UI Actions
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      
      // Notification Actions
      addNotification: (notification) => {
        const id = Date.now().toString();
        const newNotification = { ...notification, id };
        
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));
      },
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),
      
      // Helper methods for notifications
      showSuccess: (message: string, title?: string) => {
        const id = Math.random().toString(36).substring(2, 15);
        set((state) => ({
          notifications: [...state.notifications, { id, type: 'success', title: title || 'Success', message }],
        }));
      },
      showError: (message: string, title?: string) => {
        const id = Math.random().toString(36).substring(2, 15);
        set((state) => ({
          notifications: [...state.notifications, { id, type: 'error', title: title || 'Error', message }],
        }));
      },
      
      // Loading Actions
      setGlobalLoading: (loading) => set({ globalLoading: loading }),
      
      // Error Actions
      setGlobalError: (error) => set({ globalError: error }),
      
      // Navigation Actions
      setCurrentPage: (page) => set({ currentPage: page }),
      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
      
      // Search Actions
      openGlobalSearch: () => set({ globalSearchOpen: true }),
      closeGlobalSearch: () => set({ globalSearchOpen: false, globalSearchQuery: '' }),
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

      // Branch Actions
      setSelectedBranchId: (branchId) => set({ selectedBranchId: branchId }),
      
      // Reset
      reset: () => set(initialState),
    })),
    {
      name: 'app-store',
    }
  )
);


// Utility functions for common operations
export const appUtils = {
  // Success notification
  showSuccess: (title: string, message?: string) => {
    useAppStore.getState().addNotification({
      type: 'success',
      title,
      message,
      duration: 5000,
    });
  },
  
  // Error notification
  showError: (title: string, message?: string) => {
    useAppStore.getState().addNotification({
      type: 'error',
      title,
      message,
      duration: 8000,
    });
  },
  
  // Warning notification
  showWarning: (title: string, message?: string) => {
    useAppStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
    });
  },
  
  // Info notification
  showInfo: (title: string, message?: string) => {
    useAppStore.getState().addNotification({
      type: 'info',
      title,
      message,
      duration: 5000,
    });
  },
  
  // Clear all notifications
  clearAllNotifications: () => {
    useAppStore.getState().clearNotifications();
  },
  
  // Set loading state
  setLoading: (loading: boolean) => {
    useAppStore.getState().setGlobalLoading(loading);
  },
  
  // Handle API errors
  handleApiError: (error: any, defaultMessage: string = 'An error occurred') => {
    const message = error?.message || defaultMessage;
    useAppStore.getState().setGlobalError(message);
    appUtils.showError('Error', message);
  },
};

export type { Notification, User, AppUIState };
