/**
 * Payment Domain Types
 *
 * Type definitions for the payment domain.
 *
 * @module domain/types/payment
 */

// Payment Type Enum
export enum PaymentType {
  DEPOSIT = 'deposit',
  ADVANCE = 'advance',
  FINAL = 'final',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

// Payment Mode Enum
export enum PaymentMode {
  CASH = 'cash',
  UPI = 'upi',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  CHEQUE = 'cheque',
}

// Payment Entity
export interface Payment {
  readonly id: string;
  readonly order_id: string;
  payment_type: PaymentType;
  amount: number;
  payment_mode: PaymentMode;
  transaction_id?: string;
  payment_date: string;
  notes?: string;
  readonly created_by: string | null;
  readonly created_at: string;
  readonly updated_at?: string;
}

// Payment with Relations
export interface PaymentWithRelations extends Payment {
  order?: {
    id: string;
    customer: {
      name: string;
      phone: string;
    };
  };
}

// Create Payment DTO
export interface CreatePaymentDTO {
  order_id: string;
  payment_type: PaymentType;
  amount: number;
  payment_mode: PaymentMode;
  transaction_id?: string;
  notes?: string;
  created_by?: string;
}

// Update Payment DTO
export interface UpdatePaymentDTO {
  payment_mode?: PaymentMode;
  transaction_id?: string;
  notes?: string;
}

// Payment Search Parameters
export interface PaymentSearchParams {
  order_id?: string;
  payment_type?: PaymentType;
  payment_mode?: PaymentMode;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}
