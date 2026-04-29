-- Migration: Add advance payment fields to orders table
-- Advance amount is a pre-payment deducted from the grand total at order creation.
-- Unlike security_deposit (which is refundable), advance reduces amount_due directly.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_collected BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_payment_method VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_collected_at TIMESTAMPTZ;
