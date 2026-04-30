/**
 * Payment Validation Schemas
 *
 * Zod schemas for validating payment create/update operations.
 *
 * @module domain/schemas/payment.schema
 */

import { z } from 'zod';

const PaymentTypeEnum = z.enum(['deposit', 'advance', 'final', 'refund', 'adjustment']);
const PaymentModeEnum = z.enum(['cash', 'upi', 'card', 'bank_transfer', 'cheque']);

/**
 * Schema for creating a new payment
 */
export const CreatePaymentSchema = z.object({
  order_id: z.string().uuid('Invalid order ID'),
  payment_type: PaymentTypeEnum,
  amount: z.number()
    .positive('Amount must be positive')
    .max(10_000_000, 'Amount exceeds maximum limit'),
  payment_mode: PaymentModeEnum,
  transaction_id: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  created_by: z.string().uuid().optional(),
});

/**
 * Schema for updating an existing payment
 * Only payment mode, transaction ID, and notes are editable
 */
export const UpdatePaymentSchema = z.object({
  payment_mode: PaymentModeEnum.optional(),
  transaction_id: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Schema for searching/filtering payments
 */
export const PaymentSearchSchema = z.object({
  order_id: z.string().uuid().optional(),
  payment_type: PaymentTypeEnum.optional(),
  payment_mode: PaymentModeEnum.optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  limit: z.coerce.number().int().positive().optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;
export type PaymentSearchInput = z.infer<typeof PaymentSearchSchema>;
