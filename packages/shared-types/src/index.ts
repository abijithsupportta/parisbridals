// Core Entity Types

export interface Store {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  subscription_status: string;
  is_active: boolean;
  gstin: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  store_id: string;
  name: string;
  address: string;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  store_id: string;
  branch_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  store_id: string | null;
  is_global: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price_per_day: number;
  security_deposit: number;
  quantity: number;
  available_quantity: number;
  images: string[];
  sizes: string[];
  colors: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  subcategory_id: string | null;
  subvariant_id: string | null;
  track_inventory: boolean;
  low_stock_threshold: number;
  total_rentals: number;
  total_revenue: number;
  avg_rating: number;
  reviews_count: number;
  last_rented_at: string | null;
  barcode: string | null;
  material: Material;
  weight: number | null;
  gemstones: string[];
  metal_purity: MetalPurity | null;
  branch_id: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  alt_phone?: string | null;
  address: string | null;
  gstin: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  branch_id: string;
  customer_id: string;
  status: OrderStatus;
  start_date: string;
  end_date: string;
  event_date: string;
  subtotal: number;
  gst_amount: number;
  security_deposit: number;
  total_amount: number;
  deposit_returned: boolean;
  deposit_returned_at: string | null;
  delivery_method: DeliveryMethod;
  delivery_address: string | null;
  pickup_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_per_day: number;
  subtotal: number;
  condition_rating: Condition | null;
  damage_description: string | null;
  damage_charges: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes: string | null;
  changed_by: string;
  created_at: string;
}

export interface Banner {
  id: string;
  store_id: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  call_to_action: string | null;
  web_image_url: string;
  mobile_image_url: string | null;
  redirect_type: RedirectType;
  redirect_target_id: string | null;
  redirect_url: string | null;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  alt_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Enums

export enum StaffRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  IN_USE = 'in_use',
  RETURNED = 'returned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum Material {
  GOLD = 'gold',
  SILVER = 'silver',
  PLATINUM = 'platinum',
  BRASS = 'brass',
  COPPER = 'copper',
  MIXED = 'mixed',
}

export enum MetalPurity {
  K24 = '24k',
  K22 = '22k',
  K18 = '18k',
  K14 = '14k',
}

export enum Condition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  DAMAGED = 'damaged',
}

export enum DeliveryMethod {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}

export enum RedirectType {
  NONE = 'none',
  CATEGORY = 'category',
  SUBCATEGORY = 'subcategory',
  SUBVARIANT = 'subvariant',
  PRODUCT = 'product',
  URL = 'url',
}

// Form Types

export interface CreateProductInput {
  name: string;
  category_id: string;
  description?: string;
  sku?: string;
  price_per_day: number;
  security_deposit: number;
  quantity: number;
  images: string[];
  sizes: string[];
  colors: string[];
  material: Material;
  weight?: number;
  gemstones?: string[];
  metal_purity?: MetalPurity;
  branch_id: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

export interface CreateOrderInput {
  customer_id: string;
  items: {
    product_id: string;
    quantity: number;
  }[];
  start_date: string;
  end_date: string;
  event_date: string;
  delivery_method: DeliveryMethod;
  delivery_address?: string;
  pickup_address?: string;
  notes?: string;
}

export interface CreateBranchInput {
  name: string;
  address: string;
  phone?: string;
  is_main?: boolean;
}

export interface CreateStaffInput {
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  branch_id: string;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order?: number;
}

// API Response Types

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Filter Types

export interface ProductFilters {
  category_id?: string;
  material?: Material;
  min_price?: number;
  max_price?: number;
  featured?: boolean;
  search?: string;
  branch_id?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  customer_id?: string;
  branch_id?: string;
  start_date?: string;
  end_date?: string;
}
