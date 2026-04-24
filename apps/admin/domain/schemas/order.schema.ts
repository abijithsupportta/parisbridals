import { z } from "zod";
import { OrderStatus, ConditionRating, DeliveryMethod, PaymentMethod, PaymentStatus } from "../types/order";

const orderItemSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  price_per_day: z.number().nonnegative("Rent price cannot be negative"),
});

export const CreateOrderSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  branch_id: z.string().uuid("Invalid branch ID"),
  items: z.array(orderItemSchema).min(1, "Order must contain at least one item"),
  rental_start_date: z.string().datetime({ message: "Invalid rental start date" }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  rental_end_date: z.string().datetime({ message: "Invalid rental end date" }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  pickup_time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)").optional(),
  return_time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)").optional(),
  pickup_branch_id: z.string().uuid("Invalid pickup branch ID").optional(),
  event_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  delivery_method: z.nativeEnum(DeliveryMethod).optional(),
  delivery_address: z.string().max(1000).optional(),
  pickup_address: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  deposit_collected: z.boolean().optional(),
  security_deposit: z.number().nonnegative().optional(),
  deposit_collected_at: z.string().datetime().optional(),
  deposit_payment_method: z.nativeEnum(PaymentMethod).optional(),
  amount_paid: z.number().nonnegative().optional(),
  payment_status: z.nativeEnum(PaymentStatus).optional(),
}).refine((data) => {
  const start = new Date(data.rental_start_date);
  const end = new Date(data.rental_end_date);
  return end >= start;
}, {
  message: "Rental end date cannot be before start date",
  path: ["rental_end_date"],
});

export const UpdateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  rental_start_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  rental_end_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  notes: z.string().max(2000).optional(),
  delivery_method: z.nativeEnum(DeliveryMethod).optional(),
  delivery_address: z.string().max(1000).optional(),
  pickup_address: z.string().max(1000).optional(),
  event_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  deposit_collected: z.boolean().optional(),
  deposit_collected_at: z.string().datetime().optional(),
  deposit_payment_method: z.nativeEnum(PaymentMethod).optional(),
  amount_paid: z.number().nonnegative().optional(),
  payment_status: z.nativeEnum(PaymentStatus).optional(),
}).refine((data) => {
  if (data.rental_start_date && data.rental_end_date) {
    const start = new Date(data.rental_start_date);
    const end = new Date(data.rental_end_date);
    return end >= start;
  }
  return true;
}, {
  message: "Rental end date cannot be before start date",
  path: ["rental_end_date"],
});

const returnItemSchema = z.object({
  item_id: z.string().uuid("Invalid item ID"),
  returned_quantity: z.number().int().positive("Must return at least 1"),
  condition_rating: z.nativeEnum(ConditionRating),
  damage_description: z.string().max(1000).optional(),
  damage_charges: z.number().nonnegative().optional(),
});

export const ReturnOrderSchema = z.object({
  order_id: z.string().uuid("Invalid order ID"),
  items: z.array(returnItemSchema).min(1, "Must return at least one item"),
  notes: z.string().max(2000).optional(),
});
