/**
 * Order Domain Types
 *
 * Type definitions for the order domain.
 *
 * @module domain/types/order
 */

// Order Status Enum
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  IN_USE = 'in_use',
  RETURNED = 'returned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  LATE_RETURN = 'late_return',
}

// Condition Rating Enum
export enum ConditionRating {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  DAMAGED = 'damaged',
}

// Delivery Method Enum
export enum DeliveryMethod {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}

// Order Item Entity
export interface OrderItem {
  readonly id: string;
  readonly order_id: string;
  readonly product_id: string;
  quantity: number;
  price_per_day: number;
  total_price: number;
  subtotal: number;
  condition_rating?: ConditionRating;
  damage_description?: string;
  damage_charges?: number;
  readonly created_at: string;
}

// Order Entity
export interface Order {
  readonly id: string;
  readonly customer_id: string;
  readonly branch_id: string;
  status: OrderStatus;
  rental_start_date: string;
  rental_end_date: string;
  pickup_time?: string;
  return_time?: string;
  pickup_branch_id?: string;
  total_amount: number;
  subtotal: number;
  gst_amount: number;
  gst_percentage: number;
  notes: string | null;
  deposit_returned: boolean;
  deposit_returned_at?: string;
  delivery_method?: DeliveryMethod;
  delivery_address?: string;
  pickup_address?: string;
  event_date?: string;
  readonly created_at: string;
  readonly updated_at?: string;
  // Audit fields
  readonly created_by: string | null;
  readonly created_at_branch_id: string | null;
  readonly updated_by: string | null;
  readonly updated_at_branch_id: string | null;
}

// Order with Relations
export interface OrderWithRelations extends Order {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  items: OrderItem[];
  branch?: {
    id: string;
    name: string;
  };
  store?: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
  };
}

// Order Status History Entity
export interface OrderStatusHistory {
  readonly id: string;
  readonly order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  changed_at_branch_id: string | null;
  notes: string | null;
  readonly created_at: string;
}

// Order Create DTO
export interface CreateOrderDTO {
  customer_id: string;
  branch_id: string;
  items: {
    product_id: string;
    quantity: number;
    price_per_day: number;
  }[];
  rental_start_date: string;
  rental_end_date: string;
  pickup_time?: string;
  return_time?: string;
  pickup_branch_id?: string;
  event_date?: string;
  delivery_method?: DeliveryMethod;
  delivery_address?: string;
  pickup_address?: string;
  notes?: string;
}

// Order Update DTO
export interface UpdateOrderDTO {
  status?: OrderStatus;
  rental_start_date?: string;
  rental_end_date?: string;
  notes?: string;
  delivery_method?: DeliveryMethod;
  delivery_address?: string;
  pickup_address?: string;
  event_date?: string;
}

// Return Order DTO
export interface ReturnOrderDTO {
  order_id: string;
  items: {
    item_id: string;
    condition_rating: ConditionRating;
    damage_description?: string;
    damage_charges?: number;
  }[];
  notes?: string;
}

// Order Search Parameters
export interface OrderSearchParams {
  customer_id?: string;
  branch_id?: string;
  status?: OrderStatus;
  query?: string;
  limit?: number;
  offset?: number;
}

// Order Validation Result
export interface OrderValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}
