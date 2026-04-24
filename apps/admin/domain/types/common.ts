/**
 * Common Domain Types
 *
 * Shared type definitions used across different domains.
 *
 * @module domain/types/common
 */

// Base Entity Interface
export interface BaseEntity {
  readonly id: string;
  created_at: string;
  updated_at?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Search and Filter Types
export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

// File Upload Types
export interface FileUpload {
  file: File;
  url?: string;
  progress?: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface ImageUploadResult {
  url: string;
  public_id: string;
  format: string;
  size: number;
  width: number;
  height: number;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Status Enums
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ARCHIVED = 'archived',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// Currency Types
export interface Money {
  amount: number;
  currency: string;
  formatted: string;
}

// Date Range Types
export interface DateRange {
  start: string;
  end: string;
}

// Address Types
export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// Contact Types
export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}

// User Types
export interface User {
  readonly id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  created_at: string;
  last_login?: string;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export enum Permission {
  READ_PRODUCTS = 'read_products',
  WRITE_PRODUCTS = 'write_products',
  DELETE_PRODUCTS = 'delete_products',
  READ_CATEGORIES = 'read_categories',
  WRITE_CATEGORIES = 'write_categories',
  DELETE_CATEGORIES = 'delete_categories',
  READ_ORDERS = 'read_orders',
  WRITE_ORDERS = 'write_orders',
  READ_CUSTOMERS = 'read_customers',
  WRITE_CUSTOMERS = 'write_customers',
  MANAGE_STORES = 'manage_stores',
  MANAGE_USERS = 'manage_users',
}

// Store Types
export interface Store {
  readonly id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  contact_info: ContactInfo;
  address?: Address;
  settings: StoreSettings;
  is_active: boolean;
  created_at: string;
}

export interface StoreSettings {
  currency: string;
  timezone: string;
  tax_rate: number;
  shipping_enabled: boolean;
  rental_enabled: boolean;
}

// Order Types
export interface Order {
  readonly id: string;
  customer_id: string;
  items: OrderItem[];
  status: OrderStatus;
  total_amount: Money;
  rental_period: DateRange;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Audit fields
  readonly created_by: string | null;
  readonly created_at_branch_id: string | null;
  readonly updated_by: string | null;
  readonly updated_at_branch_id: string | null;
}

export interface OrderItem {
  readonly id: string;
  product_id: string;
  quantity: number;
  price_per_day: Money;
  total_price: Money;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// (Customer Types moved to customer.ts)

// Analytics Types
export interface Analytics {
  period: DateRange;
  metrics: Record<string, number>;
  trends: Array<{
    date: string;
    value: number;
  }>;
}

// Notification Types
export interface Notification {
  readonly id: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Type Guards
export const isValidId = (id: any): id is string => {
  return typeof id === 'string' && id.length > 0;
};

export const isValidEmail = (email: any): email is string => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: any): phone is string => {
  if (typeof phone !== 'string') return false;
  const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const isValidMoney = (money: any): money is Money => {
  return money && 
         typeof money.amount === 'number' && 
         typeof money.currency === 'string';
};

export const isValidDateRange = (range: any): range is DateRange => {
  return range && 
         typeof range.start === 'string' && 
         typeof range.end === 'string' &&
         new Date(range.start) <= new Date(range.end);
};
