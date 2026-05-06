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
  SCHEDULED = 'scheduled',
  DELIVERED = 'delivered',
  IN_USE = 'in_use',
  ONGOING = 'ongoing',
  PARTIAL = 'partial',
  RETURNED = 'returned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FLAGGED = 'flagged',
  LATE_RETURN = 'late_return',
}

// Payment Status Enum
export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
}

// Payment Method Enum
export enum PaymentMethod {
  CASH = 'cash',
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  OTHER = 'other',
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
  is_returned?: boolean;
  returned_at?: string;
  returned_quantity?: number;
  readonly created_at: string;
}

// Order Entity
export interface Order {
  readonly id: string;
  readonly store_id: string;
  readonly customer_id: string;
  readonly branch_id: string;
  status: OrderStatus;
  start_date: string;
  end_date: string;
  event_date: string;
  total_amount: number;
  subtotal: number;
  gst_amount: number;
  security_deposit: number;
  advance_amount: number;
  advance_collected?: boolean;
  advance_payment_method?: PaymentMethod;
  advance_collected_at?: string;
  amount_paid: number;
  payment_status: PaymentStatus;
  notes: string | null;
  deposit_collected?: boolean;
  deposit_collected_at?: string;
  deposit_payment_method?: PaymentMethod;
  deposit_returned: boolean;
  deposit_returned_at?: string;
  delivery_method?: DeliveryMethod;
  delivery_address?: string;
  pickup_address?: string;
  late_fee: number;
  discount: number;
  damage_charges_total: number;
  readonly created_at: string;
  readonly updated_at?: string;
}

// Order with Relations
export interface OrderWithRelations extends Order {
  customer: {
    id: string;
    name: string;
    phone: string;
    alt_phone?: string | null;
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
  event_date?: string;
  delivery_method?: DeliveryMethod;
  delivery_address?: string;
  pickup_address?: string;
  notes?: string;
  advance_amount?: number;
  advance_collected?: boolean;
  advance_payment_method?: string;
}

// Order Update DTO
export interface UpdateOrderDTO {
  status?: OrderStatus;
  start_date?: string;
  end_date?: string;
  notes?: string;
  delivery_method?: DeliveryMethod;
  delivery_address?: string;
  pickup_address?: string;
  event_date?: string;
  deposit_collected?: boolean;
  deposit_collected_at?: string;
  deposit_payment_method?: PaymentMethod;
  deposit_returned?: boolean;
  deposit_returned_at?: string;
  amount_paid?: number;
  payment_status?: PaymentStatus | string;
  security_deposit?: number;
  advance_amount?: number;
  advance_collected?: boolean;
  late_fee?: number;
  discount?: number;
  damage_charges_total?: number;
  total_amount?: number;
}

// Return Order DTO
export interface ReturnOrderDTO {
  order_id: string;
  items: {
    item_id: string;
    returned_quantity: number;
    condition_rating: ConditionRating;
    damage_description?: string;
    damage_charges?: number;
  }[];
  notes?: string;
  late_fee?: number;
  discount?: number;
}

// Order Search Parameters
export interface OrderSearchParams {
  customer_id?: string;
  branch_id?: string;
  status?: OrderStatus;
  query?: string;
  date_filter?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// Order Validation Result
export interface OrderValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Interval-Based Availability Types ──────────────────────────────────────

/** Status of a single calendar day */
export type DayAvailabilityStatus = 'available' | 'partial' | 'unavailable' | 'buffer';

/** A booking that occupies a product on a given day */
export interface DayBookingInfo {
  orderId: string;
  customerName: string;
  quantity: number;
  startDate: string;
  endDate: string;
  status: string;
  isBuffer?: boolean;
}

/** Per-day availability data for calendar rendering */
export interface DayAvailability {
  date: string;
  total: number;
  reserved: number;
  bufferReserved: number;
  available: number;
  status: DayAvailabilityStatus;
  bookings: DayBookingInfo[];
}

/** Full availability calendar response */
export interface AvailabilityCalendarResponse {
  productId: string;
  productName: string;
  totalQuantity: number;
  days: DayAvailability[];
}

/** Availability check result for a single item (used in order form) */
export interface ItemAvailabilityResult {
  product_id: string;
  product_name: string;
  requested: number;
  available: number;
  isAvailable: boolean;
  peakReserved: number;
  overlappingOrders: DayBookingInfo[];
}

/** Batch availability check response */
export interface BatchAvailabilityResponse {
  allAvailable: boolean;
  items: ItemAvailabilityResult[];
}
